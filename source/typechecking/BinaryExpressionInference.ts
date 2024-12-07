/**
 * Filename: BinaryExpressionInference.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Contains type checking logic for binary expressions
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { BinaryExpression, BinaryExpressionOperator } from "../ast/expressions/BinaryExpression";
import { Context } from "../ast/symbol/Context";
import { BasicType } from "../ast/types/BasicType";
import { BooleanType } from "../ast/types/BooleanType";
import { ClassType } from "../ast/types/ClassType";
import { DataType } from "../ast/types/DataType";
import { EnumType } from "../ast/types/EnumType";
import { InterfaceType } from "../ast/types/InterfaceType";
import { NullableType } from "../ast/types/NullableType";
import { ReferenceType } from "../ast/types/ReferenceType";
import { isAddable, getOperatorOverloadType, setBinaryOverrideMethodHint, isSubable, isMultiplicable, isDivisible, isModable, isLt, isLte, isGt, isGte, isOr, isAnd, isLShift, isRShift, isBAnd, isBOr, isXor, OverridableMethodType } from "./OperatorOverload";
import { matchDataTypes } from "./TypeChecking";


type DataTypeKind = "u8" | "u16" | "u32" | "u64" | "i8" | "i16" | "i32" | "i64" | "f32" | "f64";

export const basicTypePromotionMap: Record<string, Record<string, DataTypeKind>> = {
    "u8":  { "u8": "u8", "u16": "u16", "u32": "u32", "u64": "u64", "i8": "i16", "i16": "i16", "i32": "i32", "i64": "i64", "f32": "f32", "f64": "f64"},
    "u16": { "u8": "u16", "u16": "u16", "u32": "u32", "u64": "u64", "i8": "i16", "i16": "i16", "i32": "i32", "i64": "i64", "f32": "f32", "f64": "f64"},
    "u32": { "u8": "u32", "u16": "u32", "u32": "u32", "u64": "u64", "i8": "i32", "i16": "i32", "i32": "i32", "i64": "i64", "f32": "f32", "f64": "f64"},
    "u64": { "u8": "u64", "u16": "u64", "u32": "u64", "u64": "u64", "i8": "i64", "i16": "i64", "i32": "i64", "i64": "i64", "f32": "f32", "f64": "f64"},
    "i8":  { "u8": "i16", "u16": "i16", "u32": "i32", "u64": "i64", "i8": "i8", "i16": "i16", "i32": "i32", "i64": "i64", "f32": "f32", "f64": "f64"},
    "i16": { "u8": "i16", "u16": "i16", "u32": "i32", "u64": "i64", "i8": "i16", "i16": "i16", "i32": "i32", "i64": "i64", "f32": "f32", "f64": "f64"},
    "i32": { "u8": "i32", "u16": "i32", "u32": "i32", "u64": "i64", "i8": "i32", "i16": "i32", "i32": "i32", "i64": "i64", "f32": "f32", "f64": "f64"},
    "i64": { "u8": "i64", "u16": "i64", "u32": "i64", "u64": "i64", "i8": "i64", "i16": "i64", "i32": "i64", "i64": "i64", "f32": "f32", "f64": "f64"},
    "f32": { "u8": "f32", "u16": "f32", "u32": "f32", "u64": "f32", "i8": "f32", "i16": "f32", "i32": "f32", "i64": "f32", "f32": "f32", "f64": "f64"},
    "f64": { "u8": "f64", "u16": "f64", "u32": "f64", "u64": "f64", "i8": "f64", "i16": "f64", "i32": "f64", "i64": "f64", "f32": "f64", "f64": "f64"},
};

export function preCheckEnums(ctx: Context, lhs: DataType, rhs: DataType): DataType[]{
    if (lhs.is(ctx, EnumType)) {
        lhs = (lhs.to(ctx, EnumType) as EnumType).toBasicType(ctx);
    }
    if (rhs.is(ctx, EnumType)) {
        rhs = (rhs.to(ctx, EnumType) as EnumType).toBasicType(ctx);
    }

    return [lhs, rhs];
}

// addition(+), addition assignment(+=) requires two numeric inputs and returns a numeric output
function inferAddition(ctx: Context, lhs: DataType, rhs: DataType, expr: BinaryExpression): DataType {
    if(lhs.is(ctx, BasicType) && rhs.is(ctx, BasicType)){
        lhs = lhs.to(ctx, BasicType) as BasicType;
        rhs = rhs.to(ctx, BasicType) as BasicType;
        let res = basicTypePromotionMap[lhs.kind][rhs.kind];
        if (res) {
            return new BasicType(expr.location, res);
        }
        else {
            ctx.parser.customError(`Cannot use operator ${expr.operator} on types ${lhs.shortname()} and ${rhs.shortname()}`, expr.location);
        }
    }

    else if(lhs.is(ctx, ClassType) || lhs.is(ctx, InterfaceType)){
        if(isAddable(ctx, lhs as OverridableMethodType)){
            let method = getOperatorOverloadType(ctx, "__add__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
    }
    
    if(lhs.is(ctx, ClassType) || lhs.is(ctx, InterfaceType)){
        if(isAddable(ctx, lhs as OverridableMethodType)){
            let method = getOperatorOverloadType(ctx, "__add__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
    }

    ctx.parser.customError(`Cannot operator ${expr.operator} on lhs type ${lhs.shortname()}`, expr.location);
}

// subtraction(-), substraction assignment (-=) requires two numeric inputs and returns a numeric output
function inferSubtraction(ctx: Context, lhs: DataType, rhs: DataType, expr: BinaryExpression): DataType {
    if(lhs.is(ctx, BasicType) && rhs.is(ctx, BasicType)){
        lhs = lhs.to(ctx, BasicType) as BasicType;
        rhs = rhs.to(ctx, BasicType) as BasicType;

        let res = basicTypePromotionMap[lhs.kind][rhs.kind];
        if (res) {
            return new BasicType(expr.location, res);
        }
        else {
            ctx.parser.customError(`Cannot use operator ${expr.operator} on types ${lhs.shortname()} and ${rhs.shortname()}`, expr.location);
        }
    }

    if(lhs.is(ctx, ClassType) || lhs.is(ctx, InterfaceType)){
        if(isSubable(ctx, lhs as OverridableMethodType)){
            let method = getOperatorOverloadType(ctx, "__sub__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
    }

    ctx.parser.customError(`Cannot use operator ${expr.operator} on lhs type ${lhs.shortname()}`, expr.location);
}

// multiplication(*), multiplication assignment(*=) requires two numeric inputs and returns a numeric output
function inferMultiplication(ctx: Context, lhs: DataType, rhs: DataType, expr: BinaryExpression): DataType {
    if(lhs.is(ctx, BasicType) && rhs.is(ctx, BasicType)){
        lhs = lhs.to(ctx, BasicType) as BasicType;
        rhs = rhs.to(ctx, BasicType) as BasicType;
        
        let res = basicTypePromotionMap[lhs.kind][rhs.kind];
        if (res) {
            return new BasicType(expr.location, res);
        }
        else {
            ctx.parser.customError(`Cannot use operator ${expr.operator} on types ${lhs.shortname()} and ${rhs.shortname()}`, expr.location);
        }
    }

    if(lhs.is(ctx, ClassType) || lhs.is(ctx, InterfaceType)){
        if(isMultiplicable(ctx, lhs as OverridableMethodType)){
            let method = getOperatorOverloadType(ctx, "__mul__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
    }

    ctx.parser.customError(`Cannot use operator ${expr.operator} on lhs type ${lhs.shortname()}`, expr.location);
}

// division(/), division assignment requires two numeric inputs and returns a numeric output
function inferDivision(ctx: Context, lhs: DataType, rhs: DataType, expr: BinaryExpression): DataType {
    if(lhs.is(ctx, BasicType) && rhs.is(ctx, BasicType)){
        lhs = lhs.to(ctx, BasicType) as BasicType;
        rhs = rhs.to(ctx, BasicType) as BasicType;
        
        let res = basicTypePromotionMap[lhs.kind][rhs.kind];
        if (res) {
            return new BasicType(expr.location, res);
        }
        else {
            ctx.parser.customError(`Cannot use operator ${expr.operator} on types ${lhs.shortname()} and ${rhs.shortname()}`, expr.location);
        }
    }

    if(lhs.is(ctx, ClassType) || lhs.is(ctx, InterfaceType)){
        if(isDivisible(ctx, lhs as OverridableMethodType)){
            let method = getOperatorOverloadType(ctx, "__div__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
    }

    ctx.parser.customError(`Cannot use operator ${expr.operator} on lhs type ${lhs.shortname()}`, expr.location);
}

// modulo(%) requires two numeric inputs and returns a numeric output
function inferModulo(ctx: Context, lhs: DataType, rhs: DataType, expr: BinaryExpression): DataType {
    if(lhs.is(ctx, BasicType) && rhs.is(ctx, BasicType)){
        lhs = lhs.to(ctx, BasicType) as BasicType;
        rhs = rhs.to(ctx, BasicType) as BasicType;
        
        let res = basicTypePromotionMap[lhs.kind][rhs.kind];
        if (res) {
            return new BasicType(expr.location, res);
        }
        else {
            ctx.parser.customError(`Cannot use operator ${expr.operator} on types ${lhs.shortname()} and ${rhs.shortname()}`, expr.location);
        }
    }

    if(lhs.is(ctx, ClassType) || lhs.is(ctx, InterfaceType)){
        if(isModable(ctx, lhs as OverridableMethodType)){
            let method = getOperatorOverloadType(ctx, "__mod__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
    }

    ctx.parser.customError(`Cannot use operator ${expr.operator} on lhs type ${lhs.shortname()}`, expr.location);
}

// less than(<), less or equal(<=), greater than(>), greater or tequal(>=) requires two numeric inputs and returns a bool
function inferLessThan(ctx: Context, lhs: DataType, rhs: DataType, expr: BinaryExpression): DataType {
    if(lhs.is(ctx, BasicType) && rhs.is(ctx, BasicType)){
        lhs = lhs.to(ctx, BasicType) as BasicType;
        rhs = rhs.to(ctx, BasicType) as BasicType;
        
        let res = basicTypePromotionMap[lhs.kind][rhs.kind];
        if (res) {
            return new BooleanType(expr.location);
        }
        else {
            ctx.parser.customError(`Cannot use operator ${expr.operator} on types ${lhs.shortname()} and ${rhs.shortname()}`, expr.location);
        }
    }

    if(lhs.is(ctx, ClassType) || lhs.is(ctx, InterfaceType)){
        if(isLt(ctx, lhs as ClassType | InterfaceType | ReferenceType) && (expr.operator === "<")){
            let method = getOperatorOverloadType(ctx, "__lt__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
        if(isLte(ctx, lhs as ClassType | InterfaceType | ReferenceType) && (expr.operator === "<=")){
            let method = getOperatorOverloadType(ctx, "__le__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
        if(isGt(ctx, lhs as ClassType | InterfaceType | ReferenceType) && (expr.operator === ">")){
            let method = getOperatorOverloadType(ctx, "__gt__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
        if(isGte(ctx, lhs as ClassType | InterfaceType | ReferenceType) && (expr.operator === ">=")){
            let method = getOperatorOverloadType(ctx, "__ge__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
    }

    ctx.parser.customError(`Cannot use operator ${expr.operator} on lhs type ${lhs.shortname()}`, expr.location);
}

/**
 *  logical and(&&), or(||) 
 * requires two bool, basic datatypes, or nullables inputs and returns a bool
 * When used with boolean, all set,
 * when used with basic type, it needs to be casted to bool in the VM
 * when used with nullable, it is transformed to != null 
 * otherwise, check overload
 * else throw an error
 */
function inferLogicalAndOr(ctx: Context, lhs: DataType, rhs: DataType, expr: BinaryExpression) {

    if(lhs instanceof ClassType || lhs instanceof InterfaceType || lhs instanceof ReferenceType){
        if(isOr(ctx, lhs) && (expr.operator === "||")){
            let method = getOperatorOverloadType(ctx, "__or__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
        if(isAnd(ctx, lhs) && (expr.operator === "&&")){
            let method = getOperatorOverloadType(ctx, "__and__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
    }

    if (((lhs.dereference() instanceof BasicType) || (lhs instanceof BooleanType) || (lhs instanceof NullableType)) && ((rhs.dereference() instanceof BasicType) || (rhs instanceof BooleanType) || (rhs instanceof NullableType))) {
        // set the hint to bool
        expr.left.setHint(new BooleanType(expr.location));
        expr.right.setHint(new BooleanType(expr.location));

        return new BooleanType(expr.location);
    }

    ctx.parser.customError(`Cannot use operator ${expr.operator} on types ${lhs.shortname()} and ${rhs.shortname()}`, expr.location);
}

function inferCoalescing(ctx: Context, lhs: DataType, rhs:DataType, expr: BinaryExpression): DataType {
    throw "Not implemented";
}


// binary and(&), or(|), right shift(>>), left shift(<<) requires two integer inputs and returns an integer
function inferBitwiseAnd(ctx: Context, lhs: DataType, rhs: DataType, expr: BinaryExpression): DataType {
    if(lhs instanceof ClassType || lhs instanceof InterfaceType || lhs instanceof ReferenceType){
        if(isLShift(ctx, lhs) && (expr.operator === "<<")){
            let method = getOperatorOverloadType(ctx, "__lshift__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
        if(isRShift(ctx, lhs) && (expr.operator === ">>")){
            let method = getOperatorOverloadType(ctx, "__rshift__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
        if(isBAnd(ctx, lhs) && (expr.operator === "&")){
            let method = getOperatorOverloadType(ctx, "__band__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
        if(isBOr(ctx, lhs) && (expr.operator === "|")){
            let method = getOperatorOverloadType(ctx, "__bor__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
        if(isXor(ctx, lhs) && (expr.operator === "^")){
            let method = getOperatorOverloadType(ctx, "__xor__", lhs as OverridableMethodType, [rhs]);
            if(method){
                return setBinaryOverrideMethodHint(ctx, lhs, rhs, method, expr);
            }
        }
    }

    if(lhs.is(ctx, BasicType) && rhs.is(ctx, BasicType)){ 
        lhs = lhs.to(ctx, BasicType) as BasicType;
        rhs = rhs.to(ctx, BasicType) as BasicType;
        
        // make sure it is not float 
        if(lhs.kind === "f32" || lhs.kind === "f64"){
            ctx.parser.customError(`Cannot use operator ${expr.operator} on types ${lhs.shortname()} and ${rhs.shortname()}`, expr.location);
        }

        if (rhs.kind === "f32" || rhs.kind === "f64"){
            ctx.parser.customError(`Cannot use operator ${expr.operator} on types ${lhs.shortname()} and ${rhs.shortname()}`, expr.location);
        }

        return new BasicType(expr.location, basicTypePromotionMap[lhs.kind][rhs.kind]);
    }

    ctx.parser.customError(`Cannot use operator ${expr.operator} on types ${lhs.shortname()} and ${rhs.shortname()}`, expr.location);
}

// assignment(=) requires two compatible inputs and returns the lhs type
function inferAssignment(ctx: Context, lhs: DataType, rhs: DataType, expr: BinaryExpression) {
    let res = matchDataTypes(ctx, lhs, rhs);
    if (!res.success) {
        ctx.parser.customError(`Cannot use = operator on types ${lhs.shortname()} and ${rhs.shortname()}: ${res.message}`, expr.location);
    }

    /*
    TODO: handle const
    if(lhs.isConst && !lhs.isValueBasedType()){
        ctx.parser.customError(`Cannot assign to const variable/attribute`, expr.location);
    }
    */

    return lhs;
}

// equal and not equal(!=) requires two compatible inputs and returns a bool
function inferEquality(ctx: Context, lhs: DataType, rhs: DataType, expr: BinaryExpression) {
    let useStrict = (lhs.is(ctx, BasicType) && rhs.is(ctx, BasicType))?false:true;
    let res = matchDataTypes(ctx, lhs, rhs, useStrict);
    if (!res.success) {
        ctx.parser.customError(`Cannot use operator ${expr.operator} on types ${lhs.shortname()} and ${rhs.shortname()}: ${res.message}`, expr.location);
    }
    return new BooleanType(expr.location);
}


type BinaryTypeChecker = (ctx: Context, lhs: DataType, rhs: DataType, expr: BinaryExpression) => DataType;

export const binaryTypeCheckers: Record<BinaryExpressionOperator, BinaryTypeChecker> = {
    "+": inferAddition,
    "+=": inferAddition,
    "-": inferSubtraction,
    "-=": inferSubtraction,
    "*": inferMultiplication,
    "*=": inferMultiplication,
    "/": inferDivision,
    "/=": inferDivision,
    "%": inferModulo,
    "%=": inferModulo,
    "<": inferLessThan,
    "<=": inferLessThan,
    ">": inferLessThan,
    ">=": inferLessThan,
    "&&": inferLogicalAndOr,
    "||": inferLogicalAndOr,
    "??": inferCoalescing,
    "&": inferBitwiseAnd,
    "|": inferBitwiseAnd,
    "^": inferBitwiseAnd,
    ">>": inferBitwiseAnd,
    "<<": inferBitwiseAnd,
    "=": inferAssignment,
    "==": inferEquality,
    "!=": inferEquality
};