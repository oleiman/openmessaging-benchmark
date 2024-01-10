package main

import (
	"github.com/redpanda-data/redpanda/src/transform-sdk/go/transform"
	"crypto/sha512"
)

func main() {
        // Register your transform function. 
        // This is a good place to perform	kkk other setup too.
	transform.OnRecordWritten(doTransform)
}

var sink any

// doTransform is where you read the record that was written, and then you can
// return new records that will be written to the output topic
func doTransform(e transform.WriteEvent, w transform.RecordWriter) error {
	h := sha512.New()
	for j := 0; j < 10; j++ {
		h.Write(e.Record().Key)
		h.Write(e.Record().Value)
	}
	// Prevent from being optimized away
	sink = h.Sum(nil)
	return nil
}
