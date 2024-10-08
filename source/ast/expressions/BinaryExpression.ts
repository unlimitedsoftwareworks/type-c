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
import { OperatorOverloadState } from "../other/OperatorOverloadState";
import { Expression, InferenceMeta } from "./Expression";
import { Context } from "../symbol/Context";
import { DataType } from "../types/DataType";
import { ThisExpression } from "./ThisExpression";
import { Err, Ok, TypeMatchResult, matchDataTypes } from "../../typechecking/TypeChecking";
import { ArrayType } from "../types/ArrayType";
import { ElementExpression } from "./ElementExpression";
import { IndexAccessExpression } from "./IndexAccessExpression";
import { MemberAccessExpression } from "./MemberAccessExpression";
import { binaryTypeCheckers } from "../../typechecking/BinaryExpressionInference";
import { BasicType } from "../types/BasicType";
import { NullableType } from "../types/NullableType";
import { TupleDeconstructionExpression } from "./TupleDeconstructionExpression";
import { TupleConstructionExpression } from "./TupleConstructionExpression";

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
    "=" | "!=" |
    "??"
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

    infer(ctx: Context, hint: DataType | null = null, meta?: InferenceMeta): DataType {
        //if (this.inferredType) return this.inferredType;
        this.setHint(hint);

        /**
         * Infer the types of the left and right expressions
         */

        let lhsHint: DataType | null = null;

        // the following operators result in boolean types
        if(!([">", "<", ">=", "<=", "==", "!="].includes(this.operator))){
            lhsHint = hint;
        }

        // the nullish coalescing operator ?? must accept that the left hand side is potentially nullable, however the right hand side must not be nullable
        /**
         * Behavior: a ?? b ?? c =? (a ?? b) ?? (c)
         * The first coalescing that will be evaluated, will not have a parent coalescing operator, meaning
         * meta argument to `expression.infer` is undefined. Hence we start with evaluating the right hand side
         * 
         * If we encounter another coalescing operator within our tree, we can tolerate the right hand side being nullable
         * 
         * Another behavior is that when we use nullable member access: a?.b ?? c
         * The behavior of ?. changes depending on whether it is used in a coalescing operator or not
         * If it is used outside of a coalescing operator, it will return a nullable type, thus expecting <b> member to be a valid
         * type that be nulled (i.e not basic, u32 for example cannot be null)
         * 
         * If it used within a coalescing operator, it will return the type of <b> since we have a guaranteed fallback
         * 
         * After that we build the meta argument and pass it to the left.infer() call
         * 
         */
        if(this.operator === "??"){
            if(meta === undefined){
                // first infer the right hand side

                let meta: InferenceMeta = {
                    isWithinNullishCoalescing: true
                }

                // infer the left hand side
                let leftType = this.left.infer(ctx, null, meta);

                if(!(leftType.is(ctx, NullableType))){
                    ctx.parser.customError(`Cannot apply operator ?? to non-nullable LHS type ${leftType.shortname()}: LHS Must be nullable, if not, remove the ?? operator`, this.location);
                }


                let rhsType = this.right.infer(ctx, leftType);
                // rhs can be nullable, if the hint is nullable or no hint is present


                // make sure the types are compatible
                let res = matchDataTypes(ctx, leftType, rhsType);
                if(!res.success){
                    ctx.parser.customError(`Cannot apply operator ?? to types ${leftType} and ${rhsType}: ${res.message}`, this.location);
                }

                this.inferredType = rhsType;
                this.checkHint(ctx);
                return rhsType;
            }
            else {
                // we are within a coalescing operator
                let leftType = this.left.infer(ctx, null, meta);
                let rightType = this.right.infer(ctx, null, meta);

                // make sure the types are compatible
                let res = matchDataTypes(ctx, leftType, rightType);
                if(!res.success){
                    ctx.parser.customError(`Cannot apply operator ?? to types ${leftType} and ${rightType}: ${res.message}`, this.location);
                }

                this.inferredType = rightType;
                this.checkHint(ctx);
                return rightType;
            }
        }


        let lhsType: DataType

        if((this.operator == "=") && (this.left instanceof TupleConstructionExpression)){
            lhsType =(this.left as TupleConstructionExpression).inferLHSAssginment(ctx, lhsHint);
        }
        else {
            lhsType = this.left.infer(ctx, lhsHint);
        }

        let rhsType: DataType | null = null;

        if(this.operator == "="){
            rhsType = this.right.infer(ctx, lhsType);
        } else {
            // check if we need to promote the rhs type to the lhs type
            /*if(lhsType.is(ctx, BasicType) && (["+" , "+=","-" , "-=" , "*" , "*=" , "/" , "/=" , "%" , "%=" ,"==" , "!="].includes(this.operator))){
                // chech if we can promote the rhs type to the lhs type
            }*/


            let rhsHint: DataType | null = null;

            if(lhsType.is(ctx, BasicType) && (this.operator != "&&") && (this.operator != "||")){
                rhsHint = lhsType;
            }

            rhsType = this.right.infer(ctx, rhsHint);   
        }

        /**
         * Check if we are allowed to use the operator =
         */
        if(this.operator === '=') {
            if (this.left instanceof ThisExpression) {
                ctx.parser.customError("Cannot assign to this", this.location);
            }

            let canAssign = isLHSAssignable(ctx, this.left);
            if(!canAssign.success) {
                ctx.parser.customError(`Cannot assign to LHS of operator =, : ${canAssign.message}`, this.location);
            }
        }

        this.inferredType = binaryTypeCheckers[this.operator](ctx, lhsType, rhsType, this);

        this.checkHint(ctx);

        if(!this.inferredType) {
            ctx.parser.customError(`Cannot apply operator ${this.operator} to types ${lhsType} and ${rhsType}`, this.location);
        }

        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): BinaryExpression{
        return new BinaryExpression(this.location, this.left.clone(typeMap, ctx), this.right.clone(typeMap, ctx), this.operator);
    }
}

export function isLHSAssignable(ctx: Context, lhs: Expression): TypeMatchResult{
    if(lhs.isConstant && !lhs.inferredType?.isAssignable()) return Err("Cannot modify the state of a constant expression/variable");
    
    if(lhs instanceof ElementExpression) {
        if(lhs.isVariable()){
            return Ok();
        }
    }
    else if (lhs instanceof TupleConstructionExpression){
        return Ok();
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
            if(mem.left.inferredType!.is(ctx, ArrayType)){
                return Err("Cannot assign to static array fields or methods");
            }

            return isLHSAssignable(ctx, (lhs as MemberAccessExpression).left);
        }
        case "index_access":{
            return isLHSAssignable(ctx, (lhs as IndexAccessExpression).lhs);
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