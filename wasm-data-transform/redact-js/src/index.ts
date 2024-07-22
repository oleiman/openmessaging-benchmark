import { onRecordWritten, OnRecordWrittenEvent, RecordWriter, Record } from "@redpanda-data/transform-sdk";
import { createHash } from "crypto";
// import { parse } from "avsc/lib/index.js"
import { Buffer } from "buffer"


// maybe not needed
// const schema = {
//     "type": "record",
//     "name": "Interop",
//     "namespace": "org.apache.avro",
//     "fields": [
//         { "name": "intField", "type": "int" },
//         { "name": "longField", "type": "long" },
//         { "name": "stringField", "type": "string" },
//         { "name": "boolField", "type": "boolean" },
//         { "name": "floatField", "type": "float" },
//         { "name": "doubleField", "type": "double" },
//         { "name": "bytesField", "type": "bytes" },
//         { "name": "nullField", "type": "null" },
//         { "name": "arrayField", "type": { "type": "array", "items": "double" } },
//         {
//             "name": "mapField", "type":
//             {
//                 "type": "map", "values":
//                 {
//                     "type": "record", "name": "Foo",
//                     "fields": [{ "name": "label", "type": "string" }]
//                 }
//             }
//         },
//         {
//             "name": "unionField", "type":
//                 ["boolean", "double", { "type": "array", "items": "bytes" }]
//         },
//         {
//             "name": "enumField", "type":
//                 { "type": "enum", "name": "Kind", "symbols": ["A", "B", "C"] }
//         },
//         {
//             "name": "fixedField", "type":
//                 { "type": "fixed", "name": "MD5", "size": 16 }
//         },
//         {
//             "name": "recordField", "type":
//             {
//                 "type": "record", "name": "Node",
//                 "fields": [
//                     { "name": "label", "type": "string" },
//                     { "name": "children", "type": { "type": "array", "items": "Node" } }]
//             }
//         }
//     ]
// };


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
    return o;
}

// const typ = parse(schema);

onRecordWritten((event: OnRecordWrittenEvent, writer: RecordWriter) => {
    var val;
    try {
        val = JSON.parse(event.record.value.text());
    } catch (error) {
        console.warn("error reading json", error);
        return;
    }
    // val = redact(val);
    const b = JSON.stringify(val);
    writer.write({
        key: event.record.key,
        value: b,
        headers: event.record.headers,
    });
});
