package main

import (
	"bytes"
	"github.com/redpanda-data/redpanda/src/transform-sdk/go/transform"
	"avro/avro"
)

func main() {
        // Register your transform function. 
        // This is a good place to perform other setup too.
	transform.OnRecordWritten(doTransform)
}

var b = bytes.Buffer{}

// doTransform is where you read the record that was written, and then you can
// return new records that will be written to the output topic
func doTransform(e transform.WriteEvent, w transform.RecordWriter) error {
	i := avro.NewInterop()
	err := i.UnmarshalJSON(e.Record().Value)
	if err != nil {
		println("error reading json:", err)
		// OMB sends some dummy messages sometimes to test things, so just copy it out verbatium
		return nil
	}
	b.Reset()
	err = i.Serialize(&b)
	if err != nil {
		return err
	}
	return w.Write(transform.Record{
		Key:     e.Record().Key,
		Value:   b.Bytes(),
		Headers: e.Record().Headers,
	})
}
