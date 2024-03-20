/**
 * Bytecode instructions, as in the VM.
 */

export enum BytecodeInstructionType{
    /**
     * terminology:
     * r: register
     * rm: register containing memory address (read as ptr)
     * i: immediate (when used alone, its <= 255), (when used with z, it can be >= 255)
     * z: immediate value size in bytes (for immediate values > 255 when applicable)
     * c: constant (offset)
     * s: byte-size, 1, 2, 4, 8 or 0 for pointer
     */
    
    /**
     * move instruction,
     * format: mv_[dest]_[src]_[size]
     */

    /**
     * op_mov_reg_reg dest: r, src: r, bits: s
     * move 1byte from src to dest
     */
    mv_reg_reg = 0x00,

    /**
     * op_mv_reg_mem dest: r, src: r
     */
    mv_reg_reg_ptr,

    /**
     * op_mv_reg_null dest: r
     * sets reg r to null
     */
    mv_reg_null,

    /**
     * op_mv_reg_i: dest: r, value-size: z, value: i
     */
    mv_reg_i,

    /**
     * op_mv_reg_const dest: r, offset-size: z, offset: i, bytesize: s
     */
    mv_reg_const,
    mv_reg_const_ptr,


    /**
     * op_mv_global_reg_[size] offset-size: z, offset: i, source: r, bytesize: s
     * moves s bytes from register r to global pool address offset
     */
    mv_global_reg,
    mv_global_reg_ptr,

    /**
     * op_mv_reg_global_[size] dest: reg, offset-size: z, offset: i
     * moves s bytes from global pool address offset to register r
     */
    mv_reg_global,
    mv_reg_global_ptr,

    /**
     * op_s_alloc dest: r, fields-count: i, struct-size: i (2bytes)
     * creates new struct of given total ﬁelds count (arg1) and total memory
     * (arg2 and arg3), stores the address of the new struct into dest.
     */
    s_alloc,

    /**
     * op_s_alloc_shadow dest: r, copy: r fields-count: i
     * creates a shadow copy of a struct (who's address is stored in copy),
     * a shadow copy is a copy that points to the same data but with different
     * offset table. copy address is stored given register
     */
    s_alloc_shadow,

    /**
     * op_s_set_offset dest: r, fieldindex: i, offset-value: i (2 bytes)
     * sets the offset value of field i, of the struct stored in dest
     * to the given offset value
     */
    s_set_offset,

    /**
     * op_s_set_offset_shadow src: r, fieldindexsrc: i, fieldindextarget: i
     * sets the offset value of field index fieldindexsrc, of the struct
     * stored in src to the offset value of field index fieldindextarget,
     * of the original struct referenced by the shadow copy
     * ie. shadow_copy.offsets[fieldindexsrc] = original.offsets[fieldindextarget]
     */
    s_set_offset_shadow,

    /**
     * op_s_loadf_[size] dest: r, src: r fieldindex: i, bytesize: s
     * loads size bytes from field i of struct stored at src to register dest
     */
    s_loadf,
    s_loadf_ptr,

    /**
     * op_s_storef_const_[size] dest: r, fieldindex: i, constant-offset: i (8 bytes), bytesize: s
     * stores [size] bytes from constant pool address offset to field i of
     * struct stored at dest
     */
    s_storef_const,
    s_storef_const_ptr,

    /**
     * op_s_storef_reg_[size] dest: r, fieldindex: i, source: r, bytesize: s
     * stores [size] bytes from register r to field i of struct stored at dest
     */
    s_storef_reg,
    s_storef_reg_ptr,

    /**
     * op_c_alloc dest:
     * r num-methods: i, class-fields-size: i (2 bytes), classid-size: z, classid: i
     * allocates new class of given total ﬁelds count (arg1) and total fields
     * size of (arg2 and arg3), stores the address of the new class into dest.
     */
    c_alloc,

    /**
     * op_c_storem destreg: r, methodindex: i, methodaddress: i(8 bytes)
     * stores methodaddress into method table index methodindex of class stored in destreg
     */
    c_storem,

    /**
     * op_c_loadm dest: r, classreg: r methodindex: i
     * loads method address from method table of class stored in classreg to register r
     */
    c_loadm,

    /**
     * op_cstoref_reg_[size] classreg: r, fieldoffset: i (2 bytes), r: source register, bytesize: s
     * stores [size] bytes from register r to field i of class stored at classreg
     */
    c_storef_reg,
    c_storef_reg_ptr,

    /**
     * op_c_storef_const_[size] classreg: r, fieldoffset: i (2 bytes), offset: i (8 bytes), bytesize: s
     */
    c_storef_const,
    c_storef_const_ptr,


    /**
     * op_c_loadf_[size] dest: r, classreg: r, fieldoffset: i (2 bytes), bytesize: s
     * loads [size] bytes from field i of class stored at classreg to register r
     */
    c_loadf,
    c_loadf_ptr,


    /**
     * op_i_alloc dest: r, num_methods: i, class: r
     * allocates new interface method table of given total methods count (arg1),
     * interface is based on class stored in dest. interface address is
     * stored in class
     */
    i_alloc,

    /**
     * op_i_alloc_i dest: r, num_methods: i, interface: r
     * allocates new interface from another interface,
     * inheriting its parent class, and storing the new interface
     * address in dest
     */
    i_alloc_i,

    /**
     * op_i_set_offset dest: r, methodindex: i, offset-value: i (2bytes)
     * sets the offset value of method i, of the interface stored in dest
     */
    i_set_offset,

    /**
     * op_i_set_offset_i dest: r, methodindexsrc: i, methodindextarget: i, src interface: r
     * updates the offset value of method index methodindexsrc, of the interface src in
     * to the offset value of method index methodindextarget, of the interface stored in dest
     */
    i_set_offset_i,

    /**
     * op_i_set_offset_m dest: r, methodid: i (8bytes), methodindex: i (2 bytes) jumpfailure: i (8 bytes)
     * find the method methodid from the base class of the interface stored in dest,
     * sets its offset in the current interface's methodindex to the given offset value. if the methodid
     * is not found, it jumps to the given address
     */
    i_set_offset_m,

    /**
     * op_i_loadm dest: r, src: r methodindex: i
     * loads method address from method table of interface stored in src to register dest
     */
    i_loadm,

    /**
     * op_c_is_c dest: r, src: r, classid: i (8 bytes)
     * checks if the given interface who's stored in src class id is the
     * same as the given id. stores the result in r
     */
    i_is_c,

    /**
     * op_i_is_i method_id: i (8 bytes), src: r, jump-address: i (8 bytes)
     * checks if the base class of the interface which is stored in src has
     * a method with the same given id. if a method with the same id is found,
     * it continues. otherwise, it jumps to the given address.
     */
    i_is_i,

    /**
     * op_i_get_c dest: r, interface: r
     * gets the class of the given interface, stores the address of the class in r
     */
    i_get_c,

    /**
     * op_a_alloc dest: r, num_elements: i (8 bytes), element_size: z
     * allocate array of num_elements of size element_size
     * stores the address of the array in dest
     */
    a_alloc,

    /**
     * op_a_extend array: r, num_elements-size: z, num_elements: i
     * extends the array stored in r by num_elements
     */
    a_extend,

    /**
     * op_a_len dest: r, array: r
     * stores the length of the array stored in array in dest
     */
    a_len,

    /**
     * op_a_slice dest: r, array: r, start: i, end: i
     * slices the array stored in array from start to end
     */
    a_slice,

    /**
     * op_a_storef_reg_[size] dest: r, index: r, source: r, bytesize: s
     * stores [size] bytes from register src to field
     * index of array dest
     */
    a_storef_reg,
    a_storef_reg_ptr,

    /**
     * op_a_storef_const_[size] dest: r, index: r, offset: i (8 bytes), bytesize: s
     * stores [size] bytes from constant pool address offset to field
     * value stored in register index of array stored at dest
     */
    a_storef_const,
    a_storef_const_ptr,

    /**
     * op_a_loadf dest: r, index: r, src: r, bytesize: s
     * loads [size] bytes from field value stored in register index
     * of array stored at src to register dest
     */
    a_loadf,
    a_loadf_ptr,


    /**
     * op_push register: r, bytes: s
     */
    push,
    push_ptr,

    /**
     * op_push_const offset-size: z, offset: i, bytes: s
     */
    push_const,

    /**
     * op_pop register: r, bytes: s
     */
    pop,
    pop_ptr,

    /**
     * op_fn_alloc
     * allocates a function state, which is the .next of the current active one
     */
    fn_alloc,

    /**
     * op_fn_set_reg_[size] dest: r, source: r, bytesize: s
     * sets the value of the dest register in the .next function state to
     * the value of source register in the active function state
     */
    fn_set_reg,
    fn_set_reg_ptr,



    /**
     * op_fn_call function-address: r
     * calls the function at the address stored in the given register
     * this function is called after the stack frame is initialized
     * and the arguments are pushed to the stack
     */
    fn_call,
    /**
     * op_fn_calli function-address-size: z, function-address: i
     * calls the function at the given address
     * this function is called after the stack frame is initialized
     * and the arguments are pushed to the stack
     */
    fn_calli,


    /**
     * op_fn_ret returns the current function state (.prev).
     */
    fn_ret,

    /**
     * op_fn_get_ret_reg dest: r, src: r, size: b
     */
    fn_get_ret_reg,
    fn_get_ret_reg_ptr,

    /** casting instructions*/

    /**
     * op_cast_[d1]_[d2] dest: r
     * casts the value in register r from the given type
     * to the given type. overrides the value in r.
     * op_cast is used to cast between types of the same
     * size
     * example: op_cast_i8_u8 r0
     *
     */
    cast_i8_u8,
    cast_u8_i8,
    cast_i16_u16,
    cast_u16_i16,
    cast_i32_u32,
    cast_u32_i32,
    cast_i64_u64,
    cast_u64_i64,

    cast_i32_f32,
    cast_f32_i32,
    cast_i64_f64,
    cast_f64_i64,

    /**
     * op_upcast_[i|u|f] dest: r, from: s, to: s
     * up casts the value in register r from given bytes
     * to target bytes. overrides the value in r.
     * example: op_upcast_i r0, 4, 8
     * upcasts the value in r0 from 4 bytes to 8 bytes
     */
    upcast_i,
    upcast_u,
    upcast_f,

    /**
     * op_upcast_[i|u|f] dest: r, from: s, to: s
     * down casts the value in register r from given bytes
     * to target bytes. overrides the value in r.
     * example: op_downcast_i r0, 8, 4
     * downcasts the value in r0 from 8 bytes to 4 bytes
     */
    dcast_i,
    dcast_u,
    dcast_f,

    /***
     * math operations
     * op_[math]_[type] dest: r, op1: r, op2: r
     * performs the given math operation on op1 and op2
     * and stores the result in dest
     */
    add_i8,
    add_u8,
    add_i16,
    add_u16,
    add_i32,
    add_u32,
    add_i64,
    add_u64,
    add_f32,
    add_f64,

    add_ptr_u8,
    add_ptr_u16,
    add_ptr_u32,
    add_ptr_u64,

    sub_i8,
    sub_u8,
    sub_i16,
    sub_u16,
    sub_i32,
    sub_u32,
    sub_i64,
    sub_u64,
    sub_f32,
    sub_f64,

    sub_ptr_u8,
    sub_ptr_u16,
    sub_ptr_u32,
    sub_ptr_u64,

    mul_i8,
    mul_u8,
    mul_i16,
    mul_u16,
    mul_i32,
    mul_u32,
    mul_i64,
    mul_u64,
    mul_f32,
    mul_f64,

    div_i8,
    div_u8,
    div_i16,
    div_u16,
    div_i32,
    div_u32,
    div_i64,
    div_u64,
    div_f32,
    div_f64,

    mod_i8,
    mod_u8,
    mod_i16,
    mod_u16,
    mod_i32,
    mod_u32,
    mod_i64,
    mod_u64,

    lshift_i8,
    lshift_u8,
    lshift_i16,
    lshift_u16,
    lshift_i32,
    lshift_u32,
    lshift_i64,
    lshift_u64,

    rshift_i8,
    rshift_u8,
    rshift_i16,
    rshift_u16,
    rshift_i32,
    rshift_u32,
    rshift_i64,
    rshift_u64,

    band_8,
    band_16,
    band_32,
    band_64,

    bor_8,
    bor_16,
    bor_32,
    bor_64,

    bxor_8,
    bxor_16,
    bxor_32,
    bxor_64,

    bnot_8,
    bnot_16,
    bnot_32,
    bnot_64,

    and,
    or,
    not,

    j,
    /**
     * op_j_cmp_[type] arg1, arg2, cmptype: i(1 byte), jump-address: i (8 bytes)
     * compares arg1 and arg2 using the given comparison type
     * 0: equal
     * 1: not equal
     * 2: greater than
     * 3: greater than or equal
     * 4: less than
     * 5: less than or equal
     * if the comparison is true, it jumps to the given address
     */
    j_cmp_u8,
    j_cmp_i8,
    j_cmp_u16,
    j_cmp_i16,
    j_cmp_u32,
    j_cmp_i32,
    j_cmp_u64,
    j_cmp_i64,
    j_cmp_f32,
    j_cmp_f64,
    j_cmp_ptr,

    /**
     * op_reg_ffi nnameconst-offset-size: i, nameconst-offset: i, id: i (2 bytes),
     * registers an ffi of the given name at code offset and with the given id
     */
    reg_ffi,

    /**
     * op_open_ffi ffi-id: i (2 bytes)
     * opens the ffi with the given id
     */
    open_ffi,

    /**
     * op_ld_ffi dest: r, ffi-id i (2 bytes), fn-id: i (1b)
     * load an ffi method into dest register, from ffi-id and fn-id
     */
    ld_ffi,

    /**
     * op_call_ffi reg: r
     * calls a ffi stored in reg
     */
    call_ffi,

    close_ffi,

    /**
     * op_p_alloc dest: r, initfn-offset-size: z, initfn-offset: i
     * allocates a new process, storing its address in r
     * and calls the init function at the given offset
     */
    p_alloc,


    /**
     * op_p_dequeue dest: r, promise: rm
     * gets a message from the current process message queue,
     * stores the message in dest and the address of the promise
     * in the given register
     */
    p_dequeue,

    /**
     * op_p_queue_size dest: r,
     */
    p_queue_size,

    /**
     * op_p_emit targetprocess: rm, data: rm, promise: rm
     * emits data from the current process to the target
     * process message queue. rm stores the address of the
     * allocated promise
     */
    p_emit,


    /**
     * op_p_wait_queue,
     * waits for the current process queue to receive a message
     */
    p_wait_queue,


    /**
     * op_p_send_seg targetprocess: rm, data: i (<255)
     * sends a signal to the target process,
     * signals include kill, pause, resume, etc.
     */
    p_send_sig,

    /**
     * op_p_id dest: r
     */
    /**
     * op_p_id dest: r, process: pm
     * returns process id into dest reg r[u32] of process pm
     */
    p_id,

    /**
     * returns current process id
     * op_p_cid dest: r
     */
    p_cid,

    /**
     * op_p_status dest: r, process: pm
     * returns process status into dest reg r[u8] of process pm
     */
    p_state,


    /**
     * op_promise_alloc dest: rm
     * allocates a new promise, stores its address in dest
     */
    promise_alloc,

    /**
     * op_promise_resolve promise: rm, payload: rm
     * resolves the given promise with the given payload
     */
    promise_resolve,

    /**
     * op_promise_await promise: rm
     * awaits the given promise
     */
    promise_await,

    /**
     * op_promise_data dest: r, promise: rm,
     * returns promise data into dest reg r of promise pm
     * promise must have been resolved, otherwise fails
     */
    promise_data,

    /**
     * op_lock_alloc dest: rm, data: rm
     * allocates a new lock, containing data, stores its address in dest
     */
    lock_alloc,

    /**
     * op_lock_acquire lock: rm, data: r,
     * acquires the given lock. will block if the lock is already acquired.
     * i.e waiting for lock promise to resolve. stores the lock data in
     * the given argument
     */
    lock_acquire,

    /**
     * op_lock_release lock: rm
     * releases the given lock.
     */
    lock_release,


    debug_reg,

    /**
     * op_halt code: i (4bytes)
     */
    halt,

    /**
     * op_load_std libid: i, fnid: i, dest: r
     * loads a standard library function into dest reg r
     */
    load_std,

    /**
     * op_vm_health dest: r
     * returns vm health into dest reg r[u8]
     */
    vm_health,

    /**
     * op_spill_alloc num_spills: i[2 bytes]
     */
    spill_alloc,

    /**
     * op_spill_reg spill_slot: i[2 bytes], reg: r
     */
    spill_reg,

    /**
     * op_unspill_reg reg: r, spill_slot: i[2 bytes]
     */
    unspill_reg,
};

