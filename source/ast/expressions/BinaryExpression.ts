/**
 * Filename: BinaryExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a binary expression
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { InterfaceMethod } from "../other/InterfaceMethod";
import { OperatorOverloadState } from "../other/OperatorOverloadState";
import { Expression } from "./Expression";
import { Context } from "../symbol/Context";
import { DataType } from "../types/DataType";
import { ThisExpression } from "./ThisExpression";
import { Err, Ok, TypeMatchResult } from "../../typechecking/typechecking";
import { ArrayType } from "../types/ArrayType";
import { ElementExpression } from "./ElementExpression";
import { IndexAccessExpression } from "./IndexAccessExpression";
import { MemberAccessExpression } from "./MemberAccessExpression";
import { binaryTypeCheckers } from "../../typechecking/BinaryExpressionInference";

export type BinaryExpressionOperator = 
    "+" | "+=" |
    "-" | "-=" |
    "*" | "*=" |
    "/" | "/=" |
    "%" | "%=" |
    "==" | "!=" |
    "<" | "<=" |
    ">" | ">=" |
    "&&" | "||" |
    "&" | "|" | "^" |
    ">>" | "<<"|
    "=" | "!="
;


export class BinaryExpression extends Expression {
    left: Expression;
    right: Expression;
    operator: BinaryExpressionOperator;

    // capture the state of the operator overload, if any
    // default is not overloaded
    operatorOverloadState: OperatorOverloadState = new OperatorOverloadState();

    constructor(location: SymbolLocation, left: Expression, right: Expression, operator: BinaryExpressionOperator) {
        super(location, "binary_op");
        this.left = left;
        this.right = right;
        this.operator = operator;
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        if (this.inferredType) return this.inferredType;
        this.setHint(hint);

        /**
         * Infer the types of the left and right expressions
         */

        let lhsHint: DataType | null = null;

        // the following operators result in boolean types
        if(!([">", "<", ">=", "<=", "=="].includes(this.operator))){
            lhsHint = hint;
        }

        let lhsType = this.left.infer(ctx, lhsHint);
        let rhsType: DataType | null = null;

        if(this.operator == "="){
            rhsType = this.right.infer(ctx, lhsType);
        } else {
            // let rhsHint: DataType | null = null;
            rhsType = this.right.infer(ctx, lhsType);   
        }

        /**
         * Check if we are allowed to use the operator =
         */
        if(this.operator === '=') {
            if (this.left instanceof ThisExpression) {
                ctx.parser.customError("Cannot assign to this", this.location);
            }

            let canAssign = isLHSAssignable(this.left);
            if(canAssign.success) {
                ctx.parser.customError(`Cannot assign to LHS of operator =, a constant.`, this.location);
            }
        }

        this.inferredType = binaryTypeCheckers[this.operator](ctx, lhsType, rhsType, this);

        if(!this.inferredType) {
            ctx.parser.customError(`Cannot apply operator ${this.operator} to types ${lhsType} and ${rhsType}`, this.location);
        }

        return this.inferredType;

    }
}

export function isLHSAssignable(lhs: Expression): TypeMatchResult{
    if(lhs.isConstant && !lhs.inferredType?.isAssignable()) return Err("Cannot modify the state of a constant expression/variable");
    
    if(lhs instanceof ElementExpression) {
        if(lhs.isVariable()){
            return Ok();
        }
    }
    
    switch(lhs.kind){
        case "int_literal":
        case "binary_int_literal":
        case "oct_int_literal":
        case "hex_int_literal":
        case "float_literal":
        case "double_literal":
        case "string_literal":
        case "true":
        case "false":
        case "null":{
            return Err("Cannot assign to literal");
        }
        case "member_access":{
            let mem = lhs as MemberAccessExpression;
            if(mem.left.inferredType!.is(ArrayType)){
                return Err("Cannot assign to static array fields or methods");
            }

            return isLHSAssignable((lhs as MemberAccessExpression).left);
        }
        case "index_access":{
            return isLHSAssignable((lhs as IndexAccessExpression).lhs);
        }
        case "unary_op":{
            return Err("Cannot assign to unary expression");
        }
        case "binary_op":{
            return Err("Cannot assign to binary expression");
        }
        case "if_else":{
            return Err("Cannot assign to if-else expression");
        }
        case "match":{
            return Err("Cannot assign to match expression");
        }
        case "let_in":{
            return Err("Cannot assign to let expression");
        }
        case "lambda":{
            return Err("Cannot assign to lambda expression");
        }
        case "cast_op":{
            return Err("Cannot assign to cast expression");
        }
        case "instance_check":{
            return Err("Cannot assign to instance check expression");
        }
        case "function_call":{
            return Err("Cannot assign to function call expression");
        }
        case "new":{
            return Err("Cannot assign to new expression");
        }
        case "element":{
            // already checked, will not be processed
            return Ok();
        }
        case "this":{
            return Ok()
        }
        case "array_construction":{
            return Err("Cannot assign to array construction expression");
        }
        case "named_struct_construction":{
            return Err("Cannot assign to named struct construction expression");
        }
        case "unnamed_struct_construction":{
            return Err("Cannot assign to unnamed struct construction expression");
        }

        default: {
            return Err("Unknown expression type " + lhs.kind);
        }
    }
}