# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This is Redpanda's fork of the OpenMessaging Benchmark Framework — a multi-driver
benchmark suite for messaging systems (Kafka, Redpanda, Pulsar, RabbitMQ, Pravega,
NATS, RocketMQ, Redis, etc.). The Redpanda-specific deployment tooling
(`driver-redpanda/deploy/`) and the `driver-redpanda` module are the parts most
actively maintained here. CI publishes a `package-minimal` tarball to
`s3://vectorized-public/dependencies/omb/omb_minimal_<sha>.tar.gz` on every push
to `main` (see `.github/workflows/`).

## Build / run

Top-level Maven multi-module build, Java 8 source/target.

```sh
mvn clean package -DskipTests             # full build, all driver modules
mvn -pl driver-redpanda,benchmark-framework,package-minimal -am package -DskipTests   # just what's needed for Redpanda tarball
mvn -pl benchmark-framework test          # there's only one JUnit test (TestWorkerHandler); most validation is integration via real clusters
mvn license:check                         # the build runs this; license-maven-plugin enforces headers from dev/license-header.txt
```

The minimal tarball (drivers stripped down to Redpanda + Pulsar + Pravega + NATS
streaming + others not in `package-minimal/src/assemble/bin.xml`'s exclude list,
which currently leaves only `driver-api` + `driver-redpanda`) lands at
`package-minimal/target/openmessaging-benchmark-0.0.1-SNAPSHOT-bin.tar.gz`.

To run benchmarks locally after a build:

```sh
bin/benchmark -d driver-redpanda/redpanda-ack-all.yaml workloads/1-topic-1-partition-1kb.yaml
bin/benchmark-worker -p 8080 -sp 8081     # standalone HTTP worker; multiple workers form an "ensemble"
```

`bin/benchmark` falls back to `benchmark-framework/target/classes` +
`classpath.txt` when no `lib/` directory exists, so it works straight from a
build tree without packaging.

## Architecture

### Coordinator / worker split

The framework runs a single coordinator (`io.openmessaging.benchmark.Benchmark`,
launched by `bin/benchmark`) which executes a cross-product of `workloads ×
drivers`. For each pair it instantiates a `Worker` and drives it through:
`initializeDriver → createOrValidateTopics → createProducers → createConsumers →
startLoad → poll PeriodStats / CumulativeLatencies → stopAll`. Stats are merged
across workers and emitted as a JSON `TestResult` per (workload, driver) pair.

`Worker` has three implementations chosen by `--topology`:

- **`LocalWorker`** (`benchmark-framework/.../worker/`) — in-process; producers
  and consumers run inside the coordinator JVM. Used when no `--workers` is
  supplied. The bulk of the load-generation logic (rate limiting via
  `UniformRateLimiter`, HdrHistogram recording for publish / schedule / e2e
  latency, payload selection) lives here.
- **`DistributedWorkersEnsemble`** — the default for distributed runs. Splits
  the worker list into a producer half and a consumer half (or 1/3 producers,
  2/3 consumers when `-x/--extraConsumers` is passed; needed for some JMS
  setups). Topics are created once via worker[0]; all coordination goes through
  `WorkerHandler`'s HTTP API on port 8080.
- **`SwarmWorker`** — every worker is symmetric (both produces and consumes);
  doesn't require synchronized clocks. See the comment block at the top of
  `SwarmWorker.java` for the reasoning and bandwidth tradeoffs.

`WorkerHandler` (Javalin HTTP server) exposes the worker RPC surface
(`/initialize-driver`, `/create-topics`, `/start-load`, `/period-stats`, etc.).
This is the contract `DistributedWorkersEnsemble` and `SwarmWorker` speak.

### Driver SPI

Drivers implement `BenchmarkDriver` (`driver-api/`), which is a small interface:
`initialize(File config, StatsLogger)`, `getTopicNamePrefix()`, `createTopic`,
`createProducer`, `createConsumer`. The driver class is named in the YAML
config's `driverClass:` field — `LocalWorker.initializeDriver` does
`Class.forName(...).newInstance()`, so drivers must have a no-arg constructor.

Each `driver-*` module is a separate Maven module producing a jar that lands in
the assembled `lib/` directory at runtime. New drivers go in their own module
under the root, get listed in the parent `pom.xml`'s `<modules>`, and (if they
should ship in the minimal tarball) get *removed* from the exclude list in
`package-minimal/src/assemble/bin.xml`.

### Redpanda driver layout

`driver-redpanda/src/main/java/.../redpanda/` has three sibling driver variants:

- root package (`RedpandaBenchmarkDriver` extends `RedpandaBenchmarkDriverBase`)
  — the standard Kafka-protocol driver.
- `swarm/` — variant that pairs with `SwarmWorker` topology.
- `tx/` — transactional-producer variant.

Driver YAMLs at the module root (`redpanda-ack-*.yaml`,
`redpanda-exactly-once.yaml`, etc.) each pick one of these via `driverClass:`
and pass through Kafka-client config in `commonConfig` / `producerConfig` /
`consumerConfig` blocks.

### Workloads

`workloads/` contains the OMB-style workload YAMLs (`Workload.java` is the
schema). Key knobs: `topics`, `partitionsPerTopic`, `messageSize`,
`payloadFile` (paths under `payload/*.data`), `producersPerTopic`,
`consumerPerSubscription`, `producerRate`, `testDurationMinutes`,
`consumerBacklogSizeGB` (when >0, the generator buffers a backlog before
starting consumers; `testDurationMinutes` is overridden so the test runs until
the backlog drains). `existingTopicList` / `existingProduceTopicList` /
`existingConsumeTopicList` let workloads target pre-created topics; these are
mutually exclusive with `topics > 0` and validated in `Workload.validate()`.

`driver-redpanda/deploy/workloads/` holds Redpanda-specific deployment workloads
used by the Terraform/Ansible flow.

## Deployment (Redpanda)

`driver-redpanda/deploy/` is a Terraform + Ansible setup that provisions an AWS
benchmark cluster and runs benchmarks on it. The full flow lives in
`driver-redpanda/README.md`. Highlights:

- `terraform apply` provisions the cluster (vars from `terraform.tfvars`,
  template at `terraform.tfvars.example`).
- `ansible-playbook deploy.yaml` configures all nodes (uses
  `geerlingguy.node_exporter`, `prometheus.prometheus`, `grafana.grafana` —
  installed via `requirements.yaml`).
- Inventory is generated dynamically from Terraform via the
  `terraform-inventory` plugin; `hosts.ini` is gitignored.
- Then SSH to the client node and run `bin/benchmark` with a Redpanda driver
  YAML and a workload from `driver-redpanda/deploy/workloads/`.

There is also a `deployment/kubernetes/` module for running the framework on
k8s.

## Conventions

- License headers are enforced by `license-maven-plugin`. New `.java`, `.yaml`,
  `.sh`, etc. files must carry the Apache-2.0 header from `dev/license-header.txt`
  — `mvn license:format` rewrites them automatically.
- Java 8 baseline (`<source>8</source>` in the parent pom). Don't use newer
  language features even when the JDK supports them, or the modern-java-compile
  profile will fail.
- Don't change the Kafka client version in only one of `driver-kafka/pom.xml`
  and `driver-redpanda/pom.xml` — the comment in driver-redpanda's pom calls
  out that they are kept in sync.
- `payload/` is excluded from license-header checks; the `*.data` files there
  are pre-generated random payloads referenced by workload YAMLs.
- The CI workflow uploads to a public S3 bucket on push to `main`. Avoid pushing
  experimental commits to `main` if you don't want them published.
