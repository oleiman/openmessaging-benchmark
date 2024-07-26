import { onRecordWritten, OnRecordWrittenEvent, RecordWriter, } from "@redpanda-data/transform-sdk";
import { createHash } from "crypto";
import { Buffer } from "buffer"


function i32Hash(i32) {
    var hash = createHash('sha256');
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setInt32(0, i32);
    hash.update(buffer);
    return new DataView(hash.digest().buffer).getInt32(0);
}

function i64Hash(i64) {
    var hash = createHash('sha256');
    // TODO(oren): why 16?
    const buffer = new ArrayBuffer(16);
    new DataView(buffer).setBigInt64(0, BigInt(i64));
    hash.update(buffer);
    return Number(new DataView(hash.digest().buffer).getBigInt64(0));
}

function f32Hash(f32) {
    var hash = createHash('sha256');
    const buffer = new ArrayBuffer(16);
    new DataView(buffer).setFloat32(0, f32);
    hash.update(buffer);
    return new DataView(hash.digest().buffer).getFloat32(0);
}

function f64Hash(f64) {
    var hash = createHash('sha256');
    const buffer = new ArrayBuffer(16);
    new DataView(buffer).setFloat64(0, f64);
    hash.update(buffer);
    return new DataView(hash.digest().buffer).getFloat64(0);
}

function redact(o) {
    o.stringField = "";
    o.intField = i32Hash(o.intField);
    o.longField = i64Hash(o.longField);
    o.floatField = f32Hash(o.floatField);
    o.doubleField = f64Hash(o.doubleField);
}


onRecordWritten((event: OnRecordWrittenEvent, writer: RecordWriter) => {
    try {
        if (event.record.value == null) {
            console.warn("null record");
            writer.write(event.record);
        } else {
            var val = JSON.parse(event.record.value.text());
            redact(val);
            // writer.write(event.record);
            const b = JSON.stringify(val);
            writer.write({
                key: event.record.key,
                value: b,
                headers: event.record.headers,
            });
        }
    } catch (error) {
        console.warn("error reading json", error);
        return;
    }
});
