/**
 * Filename: IR.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Type-C Intermediate Representation (IR) instructions
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../../ast/symbol/SymbolLocation";

export class IRInstruction {
    location: SymbolLocation | null = null;
    type: IRInstructionType;
    args: (string | number)[];

    constructor(type: IRInstructionType, args: (string | number)[], location: SymbolLocation | null = null){
        this.type = type;
        this.args = args;
    }

    toString(){
        return `${this.type} ${this.args.join(" ")}`;
    }
}

export type IRInstructionType =
    "const_i8" |   // OK
    "const_u8" |   // OK
    "const_i16" |  // OK
    "const_u16" |  // OK
    "const_i32" |  // OK
    "const_u32" |  // OK
    "const_i64" |
    "const_u64" |
    "const_f32" |
    "const_f64" |
    "const_ptr" |
    "const_ptr_fn" | // to load a function from a given context
    "const_str" | // literal, array of characters (string)

    "global_i8" |
    "global_u8" |
    "global_i16" |
    "global_u16" |
    "global_i32" |
    "global_u32" |
    "global_i64" |
    "global_u64" |
    "global_f32" |
    "global_f64" |
    "global_ptr" |

    "local_i8" |
    "local_u8" |
    "local_i16" |
    "local_u16" |
    "local_i32" |
    "local_u32" |
    "local_i64" |
    "local_u64" |
    "local_f32" |
    "local_f64" |
    "local_ptr" |

    "arg_i8" |
    "arg_u8" |
    "arg_i16" |
    "arg_u16" |
    "arg_i32" |
    "arg_u32" |
    "arg_i64" |
    "arg_u64" |
    "arg_f32" |
    "arg_f64" |
    "arg_ptr" |

    "tmp_i8" |
    "tmp_u8" |
    "tmp_i16" |
    "tmp_u16" |
    "tmp_i32" |
    "tmp_u32" |
    "tmp_i64" |
    "tmp_u64" |
    "tmp_f32" |
    "tmp_f64" |
    "tmp_ptr" |

    "s_alloc" |
    "s_alloc_t" |
    "s_reg_field" |

    "s_get_field_i8" |
    "s_get_field_u8" |
    "s_get_field_i16" |
    "s_get_field_u16" |
    "s_get_field_i32" |
    "s_get_field_u32" |
    "s_get_field_i64" |
    "s_get_field_u64" |
    "s_get_field_f32" |
    "s_get_field_f64" |
    "s_get_field_ptr" |

    "s_set_field_u8" |
    "s_set_field_i8" |
    "s_set_field_u16" |
    "s_set_field_i16" |
    "s_set_field_u32" |
    "s_set_field_i32" |
    "s_set_field_u64" |
    "s_set_field_i64" |
    "s_set_field_f32" |
    "s_set_field_f64" |
    "s_set_field_ptr" |

    "c_alloc" |
    "c_alloc_t" |
    "c_reg_field" |
    "c_store_m" |
    "c_load_m" |

    "c_get_field_i8" |
    "c_get_field_u8" |
    "c_get_field_i16" |
    "c_get_field_u16" |
    "c_get_field_i32" |
    "c_get_field_u32" |
    "c_get_field_i64" |
    "c_get_field_u64" |
    "c_get_field_f32" |
    "c_get_field_f64" |
    "c_get_field_ptr" |

    "c_set_field_u8" |
    "c_set_field_i8" |
    "c_set_field_u16" |
    "c_set_field_i16" |
    "c_set_field_u32" |
    "c_set_field_i32" |
    "c_set_field_u64" |
    "c_set_field_i64" |
    "c_set_field_f32" |
    "c_set_field_f64" |
    "c_set_field_ptr" |


     /// used with safe casting since it requires a fail jump label
    "i_is_c" | // interface vs class instanceof checking
    "i_has_m" | // interface vs interface instanceof checking

    "a_alloc" |
    "a_extend" |
    "a_len" | // array length
    "a_slice" | // array slice
    "a_insert_a" | // insert array into another
    "a_set_index_i8" |
    "a_set_index_u8" |
    "a_set_index_i16" |
    "a_set_index_u16" |
    "a_set_index_i32" |
    "a_set_index_u32" |
    "a_set_index_i64" |
    "a_set_index_u64" |
    "a_set_index_f32" |
    "a_set_index_f64" |
    "a_set_index_ptr" |

    "a_get_index_i8" |
    "a_get_index_u8" |
    "a_get_index_i16" |
    "a_get_index_u16" |
    "a_get_index_i32" |
    "a_get_index_u32" |
    "a_get_index_i64" |
    "a_get_index_u64" |
    "a_get_index_f32" |
    "a_get_index_f64" |
    "a_get_index_ptr" |

    "a_set_reverse_index_i8" |
    "a_set_reverse_index_u8" |
    "a_set_reverse_index_i16" |
    "a_set_reverse_index_u16" |
    "a_set_reverse_index_i32" |
    "a_set_reverse_index_u32" |
    "a_set_reverse_index_i64" |
    "a_set_reverse_index_u64" |
    "a_set_reverse_index_f32" |
    "a_set_reverse_index_f64" |
    "a_set_reverse_index_ptr" |

    "a_get_reverse_index_i8" |
    "a_get_reverse_index_u8" |
    "a_get_reverse_index_i16" |
    "a_get_reverse_index_u16" |
    "a_get_reverse_index_i32" |
    "a_get_reverse_index_u32" |
    "a_get_reverse_index_i64" |
    "a_get_reverse_index_u64" |
    "a_get_reverse_index_f32" |
    "a_get_reverse_index_f64" |
    "a_get_reverse_index_ptr" |

    "fn" |
    "fn_alloc" | // prepare for a function call
    "fn_set_reg_u8" | // init args pre function call
    "fn_set_reg_u16" |
    "fn_set_reg_u32" |
    "fn_set_reg_u64" |
    "fn_set_reg_i8" |
    "fn_set_reg_i16" |
    "fn_set_reg_i32" |
    "fn_set_reg_i64" |
    "fn_set_reg_f32" |
    "fn_set_reg_f64" |
    "fn_set_reg_ptr" |

    "fn_get_reg_u8" | // init args pre function call
    "fn_get_reg_u16" |
    "fn_get_reg_u32" |
    "fn_get_reg_u64" |
    "fn_get_reg_i8" |
    "fn_get_reg_i16" |
    "fn_get_reg_i32" |
    "fn_get_reg_i64" |
    "fn_get_reg_f32" |
    "fn_get_reg_f64" |
    "fn_get_reg_ptr" |

    /**
     * Function returns are done through the registers, hence we need to keep track of which registers we will push
     * the IR for function call is as follows
     * call jump_id ret_1, ret_2, ret_3
     *
     * for example:
     * fn f(mut x: u32, y: u32) -> (a:u32, b:u32)  // returns a tuple byt also has a mut arg
     * -> call f a_reg (255), b_reg (254), x_reg (0)
     * -> mut arguments are ready from whichever register they were passed in
     * -> the return values are read from register 255 downwards
     *
     * calling f will generate the following IR:
     * call f 1, 2
     *
     *
     */
    "call" |      // direct call based on offset
    "call_ptr" |  // call based on address stored in a pointer
    "label" |

    "ret_i8" |
    "ret_u8" |
    "ret_i16" |
    "ret_u16" |
    "ret_i32" |
    "ret_u32" |
    "ret_i64" |
    "ret_u64" |
    "ret_f32" |
    "ret_f64" |
    "ret_ptr" |
    "ret_void" |
    "exit_fn" | // since we can now return tuples, we can have multiple returns. Also return values are stored in registers. this logic is used for IR and analysis.

    "push_i8" |
    "push_u8" |
    "push_i16" |
    "push_u16" |
    "push_i32" |
    "push_u32" |
    "push_i64" |
    "push_u64" |
    "push_f32" |
    "push_f64" |
    "push_ptr" |

    "pop_i8" |
    "pop_u8" |
    "pop_i16" |
    "pop_u16" |
    "pop_i32" |
    "pop_u32" |
    "pop_i64" |
    "pop_u64" |
    "pop_f32" |
    "pop_f64" |
    "pop_ptr" |

    "cast_i8_u8" |
    "cast_u8_i8" |
    "cast_i16_u16" |
    "cast_u16_i16" |
    "cast_i32_u32" |
    "cast_u32_i32" |
    "cast_i64_u64" |
    "cast_u64_i64" |
    "cast_i32_f32" |
    "cast_f32_i32" |
    "cast_i64_f64" |
    "cast_f64_i64" |
    "upcast_i" |
    "upcast_u" |
    "upcast_f" |
    "dcast_i" |
    "dcast_u" |
    "dcast_f" |

    "add_i8" |
    "add_u8" |
    "add_i16" |
    "add_u16" |
    "add_i32" |
    "add_u32" |
    "add_i64" |
    "add_u64" |
    "add_f32" |
    "add_f64" |
    "add_ptr_u8" |
    "add_ptr_u16" |
    "add_ptr_u32" |
    "add_ptr_u64" |

    "sub_i8" |
    "sub_u8" |
    "sub_i16" |
    "sub_u16" |
    "sub_i32" |
    "sub_u32" |
    "sub_i64" |
    "sub_u64" |
    "sub_f32" |
    "sub_f64" |
    "sub_ptr_u8" |
    "sub_ptr_u16" |
    "sub_ptr_u32" |
    "sub_ptr_u64" |

    "mul_i8" |
    "mul_u8" |
    "mul_i16" |
    "mul_u16" |
    "mul_i32" |
    "mul_u32" |
    "mul_i64" |
    "mul_u64" |
    "mul_f32" |
    "mul_f64" |

    "div_i8" |
    "div_u8" |
    "div_i16" |
    "div_u16" |
    "div_i32" |
    "div_u32" |
    "div_i64" |
    "div_u64" |
    "div_f32" |
    "div_f64" |

    "mod_i8" |
    "mod_u8" |
    "mod_i16" |
    "mod_u16" |
    "mod_i32" |
    "mod_u32" |
    "mod_f32" |
    "mod_i64" |
    "mod_u64" |
    "mod_f64" |

    "lshift_i8" |
    "lshift_u8" |
    "lshift_i16" |
    "lshift_u16" |
    "lshift_i32" |
    "lshift_u32" |
    "lshift_i64" |
    "lshift_u64" |

    "rshift_i8" |
    "rshift_u8" |
    "rshift_i16" |
    "rshift_u16" |
    "rshift_i32" |
    "rshift_u32" |
    "rshift_i64" |
    "rshift_u64" |

    "j_cmp_i8" |
    "j_cmp_u8" |
    "j_cmp_i16" |
    "j_cmp_u16" |
    "j_cmp_i32" |
    "j_cmp_u32" |
    "j_cmp_i64" |
    "j_cmp_u64" |
    "j_cmp_f32" |
    "j_cmp_f64" |
    "j_cmp_ptr" |
    "j_cmp_bool" |

    "j_eq_null_i8" |
    "j_eq_null_u8" |
    "j_eq_null_i16" |
    "j_eq_null_u16" |
    "j_eq_null_i32" |
    "j_eq_null_u32" |
    "j_eq_null_i64" |
    "j_eq_null_u64" |
    "j_eq_null_f32" |
    "j_eq_null_f64" |
    "j_eq_null_i16" |
    "j_eq_null_ptr" |


    "band_i8" |
    "band_u8" |
    "band_i16" |
    "band_u16" |
    "band_i32" |
    "band_u32" |
    "band_i64" |
    "band_u64" |

    "bor_i8" |
    "bor_u8" |
    "bor_i16" |
    "bor_u16" |
    "bor_i32" |
    "bor_u32" |
    "bor_i64" |
    "bor_u64" |

    "bxor_i8" |
    "bxor_u8" |
    "bxor_i16" |
    "bxor_u16" |
    "bxor_i32" |
    "bxor_u32" |
    "bxor_i64" |
    "bxor_u64" |

    "bnot_i8" |
    "bnot_u8" |
    "bnot_i16" |
    "bnot_u16" |
    "bnot_i32" |
    "bnot_u32" |
    "bnot_i64" |
    "bnot_u64" |

    "and" |
    "or" |
    "not" |

    "j" |
    "loop" | // loops to given label if given value is not zero

    "debug" | // a debug instruction, meanless in bytecode generation

    "reg_ffi" | // reg_ffi id, name
    "call_ffi" | // call_ffi id, method_id, arg_count
    "ffi_get_method" | // dest:R, ffi_id, ffi_method_id as ffi_ld

    "promise_await" |
    "debug_reg" |
    "destroy_tmp" | // destroy a temporary variable, used for register allocation
    "src_map_push" |  // sets the subsequent instruction's location to the given location
                         // fmt: file, col, row
    "src_map_pop" |     // pops the last trace location from the stack

    "closure_alloc" |
    "closure_push_env_i8" |
    "closure_push_env_u8" |
    "closure_push_env_i16" |
    "closure_push_env_u16" |
    "closure_push_env_i32" |
    "closure_push_env_u32" |
    "closure_push_env_i64" |
    "closure_push_env_u64" |
    "closure_push_env_f32" |
    "closure_push_env_f64" |
    "closure_push_env_ptr" |
    "closure_call" |
    "closure_backup" | // automatically generated with closure_call in BytecodeGenerator

    "coroutine_alloc" |
    "coroutine_fn_alloc" |
    "coroutine_get_state" |
    "coroutine_call" |
    "coroutine_yield" |
    "coroutine_ret" |
    "coroutine_reset" |
    "coroutine_finish" |

    "throw_rt" |

    // source map instructions
    "srcmap_push_loc" |
    "srcmap_pop_loc"
;
