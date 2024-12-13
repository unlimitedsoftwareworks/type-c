/**
 * Filename: BytecodeInstructions.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Lists all VM bytecode instructions
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
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
     * mov_reg_reg dest: r, src: r, bits: s
     * move 1byte from src to dest
     */
    mv_reg_reg = 0x00,

    /**
     * mv_reg_mem dest: r, src: r
     */
    mv_reg_reg_ptr,

    /**
     * mv_reg_null dest: r
     * sets reg r to null
     */
    mv_reg_null,

    /**
     * mv_reg_i: dest: r, value-size: z, value: i
     */
    mv_reg_i,

    /**
     * mv_reg_i_ptr dest: r, v: I (8bytes)
     * moves 8 bytes from the given constant to register r
     */
    mv_reg_i_ptr,

    /**
     * mv_reg_const dest: r, offset-size: z, offset: i, bytesize: s
     */
    mv_reg_const,
    mv_reg_const_ptr,


    /**
     * mv_global_reg_[size] offset-size: z, offset: i, source: r, bytesize: s
     * moves s bytes from register r to global pool address offset
     */
    mv_global_reg,
    mv_global_reg_ptr,

    /**
     * mv_reg_global_[size] dest: reg, offset-size: z, offset: i
     * moves s bytes from global pool address offset to register r
     */
    mv_reg_global,
    mv_reg_global_ptr,

    /**
     ** OP_S_ALLOC dest: R, fields-count: I, struct-size: I (2bytes)
     * creates new struct of given total ﬁelds count (arg1) and total memory
     * (arg2 and arg3), stores the address of the new struct into dest.
     */
    s_alloc,


    /**
     * s_alloc_t dest: R, template_offset: I (8 bytes)
     * Creates new struct from a template, stored at template_offset
     */
    s_alloc_t,


    /**
     * s_reg_field: dest: R,  local_field_index: I(1byte), globalFieldID: I (4 bytes), field offset: I (2 bytes)
     * Registers a new field in the struct stored in dest, with the given global field ID
     * and field offset (local), must not exceed the total fields count of the struct
     */
    s_reg_field,


    /**
     * s_loadf_[size] dest: r, src: r fieldindex: i, bytesize: s
     * loads size bytes from field i of struct stored at src to register dest
     */
    s_loadf,
    s_loadf_ptr,

    /**
     * s_storef_const_[size] dest: r, fieldindex: i, constant-offset: i (8 bytes), bytesize: s
     * stores [size] bytes from constant pool address offset to field i of
     * struct stored at dest
     */
    s_storef_const,
    s_storef_const_ptr,

    /**
     * s_storef_reg_[size] dest: r, fieldindex: i, source: r, bytesize: s
     * stores [size] bytes from register r to field i of struct stored at dest
     */
    s_storef_reg,
    s_storef_reg_ptr,

    /**
     * c_alloc
     * OP_C_ALLOC dest: R num-methods: I, num-fields: I(1b), class-fields-size: I (2 bytes), classId-size: Z, classId: I
     * allocates new class of given total ﬁelds count (arg1) and total fields
     * size of (arg2 and arg3), stores the address of the new class into dest.
     */
    c_alloc,

    /**
     * c_alloc_t dest: R, template_offset: I (8 bytes)
     * Creates new class from a template, stored at template_offset
     */
    c_alloc_t,

    /**
     * c_reg_field dest: r, field_index: i, field offset: i (2 bytes)
     * Registers a new field in the class stored in dest, with the given global field ID
     * and field offset (local), must not exceed the total fields count of the class
     */
    c_reg_field,

    /**
     * c_storem destreg: r, methodindex: i, methodaddress: i(8 bytes)
     * stores methodaddress into method table index methodindex of class stored in destreg
     */
    c_storem,

    /**
     * c_loadm dest: r, classreg: r methodindex: i
     * loads method address from method table of class stored in classreg to register r
     */
    c_loadm,

    /**
     * cstoref_reg_[size] classreg: r, fieldoffset: i (2 bytes), r: source register, bytesize: s
     * stores [size] bytes from register r to field i of class stored at classreg
     */
    c_storef_reg,
    c_storef_reg_ptr,

    /**
     * c_storef_const_[size] classreg: r, fieldoffset: i (2 bytes), offset: i (8 bytes), bytesize: s
     */
    c_storef_const,
    c_storef_const_ptr,


    /**
     * c_loadf_[size] dest: r, classreg: r, fieldoffset: i (2 bytes), bytesize: s
     * loads [size] bytes from field i of class stored at classreg to register r
     */
    c_loadf,
    c_loadf_ptr,


    /**
     * Note: even though it says i_, it is applied to a class,
     * named as such purely for semantic purposes.
     * i_is_c dest: r, src: r, classid: i (8 bytes)
     * checks if the given interface who's stored in src class id is the
     * same as the given id. stores the result in r
     */
    i_is_c,

    /**
     * Note: even though it says i_, it is applied to a class,
     * named as such purely for semantic purposes.
     * i_is_i method_id: i (4 bytes), src: r, jump-address: i (8 bytes)
     * checks if the base class of the interface which is stored in src has
     * a method with the same given id. if a method with the same id is found,
     * it continues. otherwise, it jumps to the given address.
     */
    i_has_m,


    /**
     * a_alloc dest: r, num_elements: i (8 bytes), element_size: z
     * allocate array of num_elements of size element_size
     * stores the address of the array in dest
     */
    a_alloc,

    /**
     * a_extend array: r, num_elements-size: z, num_elements: i
     * extends the array stored in r by num_elements
     */
    a_extend,

    /**
     * a_len dest: r, array: r
     * stores the length of the array stored in array in dest
     */
    a_len,

    /**
     * a_slice dest: r, array: r, start: i, end: i
     * slices the array stored in array from start to end
     */
    a_slice,

    /**
     * a_insert_a inserted_count: R, dest_arr: R, source_arr: R, index: R
     * inserts source_arr into dest_arr at the given index,
     * Returns the new position pointing at the end of the inserted elements!!
     */
    a_insert_a,

    /**
     * a_storef_reg_[size] dest: r, index: r, source: r, bytesize: s
     * stores [size] bytes from register src to field
     * index of array dest
     */
    a_storef_reg,
    a_storef_reg_ptr,

    /**
     * a_storef_reg_[size] dest: r, index: r, source: r, bytesize: s
     * stores [size] bytes from register src to field
     * index of array dest, uses reverse indexing
     */
    a_rstoref_reg,
    a_rstoref_reg_ptr,

    /**
     * a_storef_const_[size] dest: r, index: r, offset: i (8 bytes), bytesize: s
     * stores [size] bytes from constant pool address offset to field
     * value stored in register index of array stored at dest
     */
    a_storef_const,
    a_storef_const_ptr,

    /**
     * a_loadf dest: r, index: r, src: r, bytesize: s
     * loads [size] bytes from field value stored in register index
     * of array stored at src to register dest
     */
    a_loadf,
    a_loadf_ptr,


    /**
     * a_rloadf dest: r, index: r, src: r, bytesize: s
     * loads [size] bytes from field value stored in register index
     * of array stored at src to register dest, uses reverse indexing
     */
    a_rloadf,
    a_rloadf_ptr,


    /**
     * push register: r, bytes: s
     */
    push,
    push_ptr,

    /**
     * push_const offset-size: z, offset: i, bytes: s
     */
    push_const,

    /**
     * pop register: r, bytes: s
     */
    pop,
    pop_ptr,

    /**
     * fn_alloc
     * allocates a function state, which is the .next of the current active one
     */
    fn_alloc,

    /**
     * fn_set_reg_[size] dest: r, source: r, bytesize: s
     * sets the value of the dest register in the .next function state to
     * the value of source register in the active function state
     */
    fn_set_reg,
    fn_set_reg_ptr,



    /**
     * fn_call function-address: r
     * calls the function at the address stored in the given register
     * this function is called after the stack frame is initialized
     * and the arguments are pushed to the stack
     */
    fn_call,
    /**
     * fn_calli function-address-size: z, function-address: i
     * calls the function at the given address
     * this function is called after the stack frame is initialized
     * and the arguments are pushed to the stack
     */
    fn_calli,


    /**
     * fn_ret returns the current function state (.prev).
     */
    fn_ret,

    /**
     * fn_get_ret_reg dest: r, src: r, size: b
     */
    fn_get_ret_reg,
    fn_get_ret_reg_ptr,

    /** casting instructions*/

    /**
     * cast_[d1]_[d2] dest: r
     * casts the value in register r from the given type
     * to the given type. overrides the value in r.
     * cast is used to cast between types of the same
     * size
     * example: cast_i8_u8 r0
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
     * upcast_[i|u|f] dest: r, from: s, to: s
     * up casts the value in register r from given bytes
     * to target bytes. overrides the value in r.
     * example: upcast_i r0, 4, 8
     * upcasts the value in r0 from 4 bytes to 8 bytes
     */
    upcast_i,
    upcast_u,
    upcast_f,

    /**
     * upcast_[i|u|f] dest: r, from: s, to: s
     * down casts the value in register r from given bytes
     * to target bytes. overrides the value in r.
     * example: downcast_i r0, 8, 4
     * downcasts the value in r0 from 8 bytes to 4 bytes
     */
    dcast_i,
    dcast_u,
    dcast_f,

    /***
     * math operations
     * [math]_[type] dest: r, op1: r, op2: r
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
    mod_f32,
    mod_i64,
    mod_u64,
    mod_f64,

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
     * j_cmp_[type] arg1, arg2, cmptype: i(1 byte), jump-address: i (8 bytes)
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
    j_cmp_bool,

    /**
     * j_eq_null[size] arg1: R, jump-address: I (4 bytes)
     */
    j_eq_null_8,
    j_eq_null_16,
    j_eq_null_32,
    j_eq_null_64,
    j_eq_null_ptr,

    /**
     * loop arg1, dest_address: i (8 bytes)
     * jumps to the given address if the value in arg1 is not 0
     */
    //loop, NOT IN THE VM YET

    /**
     * reg_ffi nnameconst-offset-size: i, nameconst-offset: i, id: i (2 bytes),
     * registers an ffi of the given name at code offset and with the given id
     */
    reg_ffi,

    /**
     * call_ffi reg: r
     * calls a ffi stored in reg
     */
    call_ffi,

    close_ffi,


    debug_reg,

    /**
     * halt code: i (4bytes)
     */
    halt,

    /**
     * load_std libid: i, fnid: i, dest: r
     * loads a standard library function into dest reg r
     */
    load_std,

    /**
     * closure_alloc, dest:R, num_args: I, fn_address: R
     * Allocates a closure, setting its function pointer to the address in
     * function-address and preparing an environment of environment-size slots.
     */
    closure_alloc,
    /**
     * closure_push_env: dest: R, source: I 1byte, size: I 1byte
     * pushes the register I to the closure environment
     * to be used by the closure when it's called
     */
    closure_push_env,
    closure_push_env_ptr,
    closure_call,
    closure_backup,

    /**
     * coroutine instructions
     */
    coroutine_alloc,
    coroutine_fn_alloc,
    coroutine_get_state,
    coroutine_call,
    coroutine_yield,
    coroutine_ret,
    coroutine_reset,
    coroutine_finish,

    /**
     * throw_rt code: i (1 byte)
     */
    throw_rt,
}
