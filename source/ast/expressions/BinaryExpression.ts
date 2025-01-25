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
import { TupleConstructionExpression } from "./TupleConstructionExpression";
import { VoidType } from "../types/VoidType";
import { EnumType } from "../types/EnumType";
import { CoroutineType } from "../types/CoroutineType";
import { UnaryExpression } from "./UnaryExpression";
import { BinaryIntLiteralExpression, HexIntLiteralExpression, IntLiteralExpression, OctIntLiteralExpression } from "./LiteralExpression";
import { BooleanType } from "../types/BooleanType";
import { StringEnumType } from "../types/StringEnumType";
import { BuiltinModules } from "../../BuiltinModules";
import { FunctionCallExpression } from "./FunctionCallExpression";

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

function isArithmeticOperator(op: BinaryExpressionOperator): boolean {
    return ["+", "-", "*", "/", "%", "^", ">>", "<<"].includes(op);
}

function isBinaryResultingOperator(op: BinaryExpressionOperator): boolean {
    return ["==", "!=", "<", "<=", ">", ">=", "&&", "||"].includes(op);
}

function isBasicType(type: DataType): boolean {
    return ["i8", "u8", "i16", "u16", "i32", "u32", "i64", "u64", "f32", "f64", "bool"].includes(type.kind);
}

function isLiteralIntExpr(e: Expression): boolean {
    return (e instanceof IntLiteralExpression) || (e instanceof HexIntLiteralExpression) || (e instanceof BinaryIntLiteralExpression) || (e instanceof OctIntLiteralExpression);
}

export class BinaryExpression extends Expression {
    left: Expression;
    right: Expression;
    operator: BinaryExpressionOperator;

    // capture the state of the operator overload, if any
    // default is not overloaded
    operatorOverloadState: OperatorOverloadState = new OperatorOverloadState();

    promotedType: DataType | null = null;


    /**
     * A global flag to indicate if we are within nullish coalescing operator
     * to help with type checking, since outside nullish coalescing, nullable 
     * member access is not allowed to return non-nullable types, but within
     * nullish coalescing, it is allowed
     */
    static isWithinNullishCoalescing: boolean = false;

    // set by the bytecode generator when transforming expressions into others,
    // to ignore constness of the left hand side
    // one is use example is foreach -> for

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

        if(hint) {
            hint.resolve(ctx);
        }

        // the following operators result in boolean types
        if(!([">", "<", ">=", "<=", "==", "!="].includes(this.operator)) && (hint) && (isBasicType(hint))){
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
            BinaryExpression.isWithinNullishCoalescing = true;
            if(meta === undefined){
                // first infer the right hand side

                let meta: InferenceMeta = {
                    isWithinNullishCoalescing: true
                }

                // infer the left hand side
                let leftType = this.left.infer(ctx, null, meta);

                // if we have a non-null type, then at least the left must be a nullable member access
                // we can have x?.y or x?.y()
                if(!(leftType.is(ctx, NullableType))){
                    let baseExpr = this.left;
                    if(baseExpr instanceof FunctionCallExpression){
                        baseExpr = (baseExpr as FunctionCallExpression).lhs;
                    }
                    if(!((baseExpr instanceof MemberAccessExpression) && (baseExpr.isNullable)) ){
                        ctx.parser.customError(`Cannot apply operator ?? to non-nullable LHS type ${leftType.getShortName()}: LHS Must be nullable, if not, remove the ?? operator`, this.location);
                    }
                }

                // now we need to be safe, hence we disable nullish coalescing,
                // it will re-enabled if we encounter another nested ?? operator
                BinaryExpression.isWithinNullishCoalescing = false;

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
                BinaryExpression.isWithinNullishCoalescing = false;
                return rightType;
            }

            BinaryExpression.isWithinNullishCoalescing = false;
        }


        let lhsType: DataType

        if((this.operator == "=") && (this.left instanceof TupleConstructionExpression)){
            lhsType =(this.left as TupleConstructionExpression).inferLHSAssginment(ctx, lhsHint);
        }
        else {
            lhsType = this.left.infer(ctx, null);
            if(lhsType.is(ctx, BasicType) && (hint?.is(ctx, BasicType))){
                // reinfer to apply any promotion
                lhsType = this.left.infer(ctx, hint);
            }
        }

        let rhsType: DataType | null = null;

        if(this.operator == "="){
            rhsType = this.right.infer(ctx, lhsType);
        } else {
            rhsType = this.right.infer(ctx, null);   
        }

        /**
         * Check if we are allowed to use the operator =
         */
        if(this.operator === '=') {
            if (this.left instanceof ThisExpression) {
                ctx.parser.customError("Cannot assign to this", this.location);
            }

            let canAssign = meta?.ignoreConst ? Ok() : canAssignLHSRHS(ctx, this.left, this.right);

            /**
             * We need to ignore constness when assigning a `this` field/subfield to a class constructor
             */
            let ignoreConst = this.left.isConstant === 0;

            //let canAssign2 = meta?.ignoreConst ? Ok() : isLHSAssignable(ctx, this.left);
            if(!canAssign.success && !ignoreConst && Context.InferenceMode != "codegen") {
                ctx.parser.customError(`Cannot assign to LHS of operator =, : ${canAssign.message}`, this.location);
            }
        }

        if((isLiteralIntExpr(this.left)) && !(isLiteralIntExpr(this.right)) && isBasicType(rhsType)){
            this.left.setHint(this.right.inferredType);
            lhsType = this.right.inferredType!;
        }

        if((isLiteralIntExpr(this.right)) && !(isLiteralIntExpr(this.left)) && isBasicType(lhsType)){
            this.right.setHint(this.left.inferredType);
            rhsType = this.left.inferredType!;
        }

        if(isArithmeticOperator(this.operator) && (lhsType.is(ctx, StringEnumType))){
            lhsType = BuiltinModules.String!;
        }

        let promotionType = binaryTypeCheckers[this.operator](ctx, lhsType, rhsType, this);
        this.promotedType = promotionType;

        if(((lhsType.is(ctx, BasicType) || lhsType.is(ctx, BooleanType)) && (rhsType.is(ctx, BasicType) || rhsType.is(ctx, BooleanType)))){
            //this.right.infer(ctx, promotionType);
            //this.left.infer(ctx, promotionType);

            this.right.setHint(promotionType);
            this.left.setHint(promotionType);
        }

        if(isBinaryResultingOperator(this.operator)){
            this.inferredType = new BooleanType(this.location);
        }
        else {
            this.inferredType = promotionType;
        }

        if(!this.inferredType) {
            ctx.parser.customError(`Cannot apply operator ${this.operator} to types ${lhsType} and ${rhsType}`, this.location);
        }

        this.checkHint(ctx);
        this.isConstant = this.left.isConstant;

        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): BinaryExpression{
        return new BinaryExpression(this.location, this.left.clone(typeMap, ctx), this.right.clone(typeMap, ctx), this.operator);
    }
}

export function canAssignLHSRHS(ctx: Context, lhs: Expression, rhs: Expression): TypeMatchResult{
    let lhsRes = isLHSAssignable(ctx, lhs);
    if (!lhsRes.success) return lhsRes;

    let rhsSafe = isRHSConstSafe(ctx, rhs);
    
    // a lot of times, rhs is a const, but actually safe, such as let x = 3 + 4
    if (!lhs.isConstant && rhsSafe) return Ok();
    
    if (rhs.isConstant && !lhs.isConstant) return Err("Cannot assign a constant expression to a non-constant expression");

    return Ok();
}

export function isRHSConstSafe(ctx: Context, rhs: Expression): boolean{
    if(rhs.inferredType?.is(ctx, VoidType)) return false;
    
    // we can assign const basic types to non-const basic types
    if(rhs.inferredType?.is(ctx, BasicType) || (rhs.inferredType?.is(ctx, EnumType))){
        return true;
    }
    // will need to check rhs.const
    return false;
}

export function isLHSAssignable(ctx: Context, lhs: Expression): TypeMatchResult{
    if(lhs.isConstant || !lhs.inferredType?.isAssignable()) return Err("Cannot modify the state of a constant expression/variable");
    
    if(lhs instanceof ElementExpression) {
        if(lhs.isVariable()){
            return Ok();
        }
        if(lhs._isNamespace){
            return Err("Cannot assign to a namespace");
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
            return Err("Cannot assign to a literal");
        }
        case "member_access":{
            let mem = lhs as MemberAccessExpression;
            if(mem.left.inferredType!.is(ctx, ArrayType)){
                return Err("Cannot assign to static array fields or methods");
            }
            if(mem.left.inferredType!.is(ctx, CoroutineType)){
                return Err("Cannot assign to coroutine fields");
            }

            return isLHSAssignable(ctx, (lhs as MemberAccessExpression).left);
        }
        case "index_access":{
            return isLHSAssignable(ctx, (lhs as IndexAccessExpression).lhs);
        }
        case "unary_op":{
            if((lhs as UnaryExpression).operator == "!!"){
                return Ok()
            }
            else {
                Err("Cannot assign to denull expression");
            }
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
        case "mutate":{
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