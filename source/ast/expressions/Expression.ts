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
import { matchDataTypes } from "../../typechecking/TypeChecking";
import { BasicType } from "../types/BasicType";


/**
 * InferenceMeta is used to store metadata about the inference process.
 * 
 * isWithinNullishCoalescing is true if the expression is within a nullish coalescing expression, this is used to allow the access of nullable members.
 * fallbackDataType is the type that the expression should fallback to if the expression is null.
 */
export type InferenceMeta = {
    /**
     * isWithinNullishCoalescing: is true if the expression is within a nullish coalescing expression, 
     * this is used to allow the access of nullable members.
     */
    isWithinNullishCoalescing?: boolean;

    /**
     * isBeingAssigned: is true if the expression is being assigned to,
     * this is used to allow the assignment of partial structs, because normally accessing
     * a partial struct without nullish coalescing will result in an error
     */
    isBeingAssigned?: boolean;

    /**
     * ignoreConst: used by code generator to ignore constness of the expression,
     * because during the code gen the AST can be rewritten to be more efficient,
     * and we can safely ignore constness of the expression.
     */
    ignoreConst?: boolean; 

    /**
     * Used to infer element expression, which is potentially a function call.
     * When overloading functions, we need to find a function with the element name
     * but also which can accept specific arguments, which are passed as an array.
     */
    args?: Expression[];
}

export type ExpressionKind = 
    "array_construction" | // [1, 2, 3]
    "array_unpacking" | // [1, 2, ...rest]
    "binary_op" | // 1 + 2
    "unary_op" | // -1
    "cast_op" | // x as Y
    "element" | // x
    "function_call" | // f()
    "if_else" | // if x => y else z
    "index_access" | // x[1]
    "index_set" | // x[1] = 2
    "reverse_index_access" | // x[-1]
    "reverse_index_set" | // x[-1] = 2
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
    "this" | // this
    "unnamed_struct_construction" | // { 1, 2 }
    "tuple_deconstruction"  | // (a) = (1, 2, 3)
    "tuple_construction" | // (1, 2, 3) = f()
    "array_deconstruction" | // [a, b, ...rest] = [1, 2, 3]
    "object_deconstruction" | // { a, b, ...rest } = { a: 1, b: 2, c: 3 }
    "coroutine_construction" | // coroutine  ...
    "do_expression" | // do { ... }
    "yield"  | // yield x
    "mutate" | // mutate x
    "unreachable" | // unreachable
    "throw" | // throw x
    "this_distributed_assign" // this += {x, y, z}
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
     * 
     * 0 is used to indicate that the base expression is `this` and constness depends
     * if we are within a class constructoror not.
     */
    isConstant: true | false | 0  = false;

    static _expressionCounter: number = 0;
    id: number = Expression._expressionCounter++;

    static reset() {
        Expression._expressionCounter = 0;
    }

    constructor(location: SymbolLocation, kind: ExpressionKind){
        this.location = location;
        this.kind = kind;
    }

    setHint(hint: DataType | null){
        this.hintType = hint;
    }

    
    checkHint(ctx: Context, strict: boolean = true){
        if(this.hintType) {

            /**
             * to allow u64*f32 for example, we disable strictness when both basic types
             */
            if(this.hintType!.is(ctx, BasicType) && this.inferredType!.is(ctx, BasicType)){
                strict = false;
            }

            let r = matchDataTypes(ctx, this.hintType!, this.inferredType!, strict);
            if(!r.success) {
                let r = matchDataTypes(ctx, this.hintType!, this.inferredType!, strict);
                r = matchDataTypes(ctx, this.hintType!, this.inferredType!, strict);
                    ctx.parser.customError(`Type mismatch, expected ${this.hintType!.getShortName()} but found ${this.inferredType!.getShortName()}: ${r.message}`, this.location);
            }
        }
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
    infer(ctx: Context, hint: DataType | null = null, meta: InferenceMeta={}): DataType{
        throw new Error("infer is not implemented on abstract Expression");
    }

    /**
     * Special infer, overritten only by TupleConstructionExpression.
     * Key idea is that, when a return statement or an expression function is being
     * inferred, we call infer Return, from that base, but all the way down we use
     * .infer.
     * 
     */
    inferReturn(ctx: Context, hint: DataType | null = null, meta?: InferenceMeta): DataType{
        return this.infer(ctx, hint, meta);
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): Expression{
        throw new Error("clone is not implemented on abstract Expression");
    }
}