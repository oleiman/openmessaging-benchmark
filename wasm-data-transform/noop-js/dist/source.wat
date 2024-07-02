
(module
	(memory (import "js_vm" "memory") 0)

	(func (export "file_length") (result i32)
          (i32.const 151)
        )

	(func (export "get_file") (param $buffer_ptr i32)
		;; Copy the source from data segment 0.
		(memory.init $source
			(local.get $buffer_ptr) ;; Memory destination
			(i32.const 0)           ;; Start index
			(i32.const 151)          ;; Length
                )
		(data.drop $source)
        )
	(data $source "\2f\2f\20\73\72\63\2f\69\6e\64\65\78\2e\6a\73\0a\69\6d\70\6f\72\74\20\7b\20\6f\6e\52\65\63\6f\72\64\57\72\69\74\74\65\6e\20\7d\20\66\72\6f\6d\20\22\40\72\65\64\70\61\6e\64\61\2d\64\61\74\61\2f\74\72\61\6e\73\66\6f\72\6d\2d\73\64\6b\22\3b\0a\6f\6e\52\65\63\6f\72\64\57\72\69\74\74\65\6e\28\28\65\76\65\6e\74\2c\20\77\72\69\74\65\72\29\20\3d\3e\20\7b\0a\20\20\77\72\69\74\65\72\2e\77\72\69\74\65\28\65\76\65\6e\74\2e\72\65\63\6f\72\64\29\3b\0a\7d\29\3b\0a"))
