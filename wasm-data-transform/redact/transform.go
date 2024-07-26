package main

import (
	"crypto/sha256"
	"encoding/binary"
	"github.com/redpanda-data/redpanda/src/transform-sdk/go/transform"
	"math"
	"redact/avro"
)

func main() {
	// Register your transform function.
	// This is a good place to perform other setup too.
	transform.OnRecordWritten(doTransform)
}

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
	redact(&i)
	b, err := i.MarshalJSON()
	if err != nil {
		return err
	}
	return w.Write(transform.Record{
		Key:     e.Record().Key,
		Value:   b,
		Headers: e.Record().Headers,
	})
}

func redact(i *avro.Interop) {
	i.StringField = ""
	i.IntField = i32Hash(i.IntField)
	i.LongField = i64Hash(i.LongField)
	i.FloatField = f32Hash(i.FloatField)
	i.DoubleField = f64Hash(i.DoubleField)
}

func i32Hash(i int32) int32 {
	var buf [4]byte
	binary.BigEndian.PutUint32(buf[:], uint32(i))
	b := hash(buf[:])
	return int32(binary.BigEndian.Uint32(b))
}

func i64Hash(i int64) int64 {
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], uint64(i))
	b := hash(buf[:])
	return int64(binary.BigEndian.Uint64(b))
}

func f32Hash(f float32) float32 {
	var buf [4]byte
	binary.BigEndian.PutUint32(buf[:], math.Float32bits(f))
	b := hash(buf[:])
	return math.Float32frombits(binary.BigEndian.Uint32(b))
}

func f64Hash(f float64) float64 {
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], math.Float64bits(f))
	b := hash(buf[:])
	return math.Float64frombits(binary.BigEndian.Uint64(b))
}

func hash(b []byte) []byte {
	h := sha256.Sum256(b)
	return h[:]
}
