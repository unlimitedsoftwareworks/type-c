/**
 * Filename: Expression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an abstract Expression
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { DataType } from "../types/DataType";


export type ExpressionKind = 
    "array_construction" | // [1, 2, 3]
    "binary_op" | // 1 + 2
    "unary_op" | // -1
    "cast_op" | // x as Y
    "element" | // x
    "function_call" | // f()
    "if_else" | // if x => y else z
    "index_access" | // x[1]
    "index_set" | // x[1] = 2
    "instance_check" | // x is Y
    "lambda" | // x => y
    "let_in" | // let x = 1 in y
    // Literals
    "string_literal" |  // "hello"
    "binary_string_literal" |  // b"hello"
    "char_literal" |  // 'h'
    "int_literal" |  // 1
    "binary_int_literal" | // 0b101
    "oct_int_literal" | // 0o101
    "hex_int_literal" |  // 0x101
    "float_literal" |  // 1.0f
    "double_literal" |  // 1.0
    "true" |  // true
    "false" |  // false
    "null"| // null

    "match" | // match x { .. }
    "member_access" | // x.y
    "nullable_member_access" | // x?.y
    "named_struct_construction" | // { x: 1, y: 2 }
    "new" | // new X()
    "spawn" | // spawn x
    "this" | // this
    "unnamed_struct_construction" // { 1, 2 }
;

export class Expression {
    kind: ExpressionKind;
    location: SymbolLocation;

    /**
     * inferredType is the type of the expression as inferred by the compiler
     * and the actual type of the expression as determined by the compiler.
     */
    inferredType: DataType | null = null;

    /**
     * hintType is the type of the expression as hinted by the programmer.
     * 
     * for example: 
     *      let y: i32 = 1 // 
     *      let x: i64 = y // x has a hint type of i64 and an inferred type of i32
     */
    hintType: DataType | null = null;

    /**
     * isConstant is true if the expression is a constant expression.
     * When isConstant is true, the expression cannot have its state changed.
     */
    isConstant: boolean = false;

    constructor(location: SymbolLocation, kind: ExpressionKind){
        this.location = location;
        this.kind = kind;
    }

    setHint(hint: DataType | null){
        this.hintType = hint;
    }

    /**
     * this method is called recursively for every expression.
     * It has three goals:
     * - make sure the types are correct
     * - infer the type of the expressions (inferredType field)
     * - set the hint type of the expressions (hintType field)
     * 
     * @param ctx parent context
     * @param hint hint type, possibly null
     * @returns the inferred type of the expression (this.inferredType)
     * 
     * For example:
     * `let x = y` in this case, the expression `y` is inferred with a 
     * hint type of `null`.
     * in this 
     */
    infer(ctx: Context, hint: DataType | null = null): DataType{
        throw new Error("infer is not implemented on abstract Expression");
    }
}