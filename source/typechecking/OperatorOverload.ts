/**
 * Filename: OperatorOverload.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Contains type checking for operator overloads for classes and interfaces
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { BinaryExpression } from "../ast/expressions/BinaryExpression";
import { Expression } from "../ast/expressions/Expression";
import { UnaryExpression } from "../ast/expressions/UnaryExpression";
import { InterfaceMethod } from "../ast/other/InterfaceMethod";
import { Context } from "../ast/symbol/Context";
import { ClassType } from "../ast/types/ClassType";
import { DataType } from "../ast/types/DataType";
import { InterfaceType } from "../ast/types/InterfaceType";
import { ReferenceType } from "../ast/types/ReferenceType";
import { MethodOperatorName } from "../parser/parsefuncs";
import { matchDataTypes } from "./TypeChecking";


export type OverridableMethodType = InterfaceType | ClassType | ReferenceType;

/**
 * __index__ x[i, j, ...]
 */
export function isIndexable(ctx: Context, dt: OverridableMethodType) {
    return dt.methodExists(ctx, "__index__");
}

export function setIndexesHint(ctx: Context, method: InterfaceMethod, exprList: Expression[]){
    if(method.header.parameters.length != exprList.length){
        ctx.parser.customError(`Type mismatch in __index__: expected ${method.header.parameters.length} arguments, got ${exprList.length}`, exprList[0].location);
    }

    for(let i = 0; i < method.header.parameters.length; i++){
        let param = method.header.parameters[i];
        let expr = exprList[i];

        expr.setHint(param.type);
    }

    return method.header.returnType;
}

/**
 *  __index_set__ x[i, j, ...] = y
 */
export function isIndexSettable(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__index_set__");
}

export function setIndexesSetHint(ctx: Context, method: InterfaceMethod, indexes: Expression[]){

    // make sure rest of methods match the index access types
    for(let i = 0; i < indexes.length; i++){
        let paramType = method.header.parameters[i + 1].type;
        let res = matchDataTypes(ctx, paramType, indexes[i].infer(ctx, paramType));
    }

    // return the method return type
    return method.header.returnType;
}

export function setReverseIndexesSetHint(ctx: Context, method: InterfaceMethod, index: Expression){

    // param 1 is the index, same as index set
    let paramType = method.header.parameters[1].type;
    let res = matchDataTypes(ctx, paramType, index.infer(ctx, paramType));
    if(!res.success){
        ctx.parser.customError(`Type mismatch in __reverse_index_set__: ${res.message}`, index.location);
    }

    // return the method return type
    return method.header.returnType;
}


/**
 * __index__ x[i, j, ...]
 */
export function isReverseIndexable(ctx: Context, dt: OverridableMethodType) {
    return dt.methodExists(ctx, "__reverse_index__");
}

/**
 *  __index_set__ x[i, j, ...] = y
 */
export function isReverseIndexSettable(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__reverse_index_set__");
}

/**
 * __call__ x(...)
 */
export function isCallable(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__call__");
}

export function matchCall(ctx: Context, method: InterfaceMethod, exprList: Expression[]){
    if(method.header.parameters.length != exprList.length){
        ctx.parser.customError(`Type mismatch in __call__: expected ${method.header.parameters.length} arguments, got ${exprList.length}`, exprList[0].location);
    }

    for(let i = 0; i < method.header.parameters.length; i++){
        let param = method.header.parameters[i];
        let expr = exprList[i];

        let res = matchDataTypes(ctx, param.type, expr.infer(ctx, param.type));
        if(!res.success){
            ctx.parser.customError(`Type mismatch in __call__, parameter #${i} "${param.name}": cannot assign type '${expr.infer(ctx).shortname()}' to parameter of type '${param.type.shortname()}': ${res.message}`, expr.location);
        }
    }

    return method.header.returnType;
}


/**
 * Marks the operation as a method call and sets the hint for the rhs
 * @param ctx 
 * @param lhs 
 * @param rhs 
 * @param method 
 * @param expr 
 * @returns 
 */
export function setBinaryOverrideMethodHint(ctx: Context, lhs: DataType, rhs: DataType, method: InterfaceMethod, expr: BinaryExpression) {
    expr.right.setHint(method.header.parameters[0].type);
    expr.operatorOverloadState.setMethodRef(method)
    return method.header.returnType;
}


/**
 * Marks the operation as a method call
 * @param ctx 
 * @param lhs 
 * @param rhs 
 * @param method 
 * @param expr 
 * @returns 
 */
export function setUnaryOverrideMethodHint(ctx: Context, uhs: DataType, method: InterfaceMethod, expr: UnaryExpression) {
    expr.operatorOverloadState.setMethodRef(method)
    return method.header.returnType;
}


/**
 * __add__ x + y
 */

export function isAddable(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__add__");
}

export function getOperatorOverloadType(ctx: Context, __op__: string, dt: OverridableMethodType, types: DataType[]): InterfaceMethod | null{
    if(dt.is(ctx, ClassType)){
        let classType = dt.to(ctx, ClassType) as ClassType;
        let method = classType.getMethodBySignature(ctx, __op__, types, null, []);

        if(method.length == 0){
            return null;
        }
        else if(method.length == 1){
            return method[0];
        }
        else {
            ctx.parser.customError(`Ambiguous ${__op__} method for type ${dt.shortname()}`, dt.location);
        }

    }
    else if(dt.is(ctx, InterfaceType)){
        let interfaceType = dt.to(ctx, InterfaceType) as InterfaceType;
        let method = interfaceType.getMethodBySignature(ctx, __op__, types, null);

        if(method.length == 0){
            return null;
        }
        else if(method.length == 1){
            return method[0];
        }
        else {
            ctx.parser.customError(`Ambiguous ${__op__} method for type ${dt.shortname()}`, dt.location);
        }

    }
    else {
        return null
    }
}

/**
 * __sub__ x - y
 */

export function isSubable(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__sub__");
}

/**
 * __mul__ x * y
 */

export function isMultiplicable(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__mul__");
}

/**
 * __div__ x / y
 */

export function isDivisible(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__div__");
}

/**
 * __mod__ x % y
 */

export function isModable(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__mod__");
}

/**
 * __gt__ x > y
 */

export function isGt(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__gt__");
}

/**
 * __lt__ x < y
 */

export function isLt(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__lt__");
}

/**
 * __ge__ x >= y
 */

export function isGte(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__ge__");
}

/**
 * __le__ x <= y
 */

export function isLte(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__le__");
}


/**
 * __lshift__  x << y
 */

export function isLShift(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__lshift__");
}

/**
 * __rshift__  x >> y
 */

export function isRShift(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__rshift__");
}

/**
 * __band__  x & y
 */

export function isBAnd(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__band__");
}

/**
 * __bor__  x | y
 */

export function isBOr(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__bor__");
}

/**
 * __xor__  x ^ y
 */

export function isXor(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__xor__");
}

/**
 * __and__  x && y
 */

export function isAnd(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__and__");
}

/**
 * __or__  x || y
 */

export function isOr(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__or__");
}

/**
 * __neg__  -x
 */

export function isNeg(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__neg__");
}

/**
 * __not__  !x
 */

export function isNot(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__not__");
}

/**
 * __bnot__  ~x
 */

export function isBNot(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__bnot__");
}

/**
 * __inc__ x++
 */

export function isInc(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__inc__");
}

/**
 * __dec__ x--
 */

export function isDec(ctx: Context, dt: OverridableMethodType){
    return dt.methodExists(ctx, "__dec__");
}


export function getOperatorOverloadName(ctx: Context, op: MethodOperatorName){
    switch(op){
        case "+": return "__add__";
        case "-": return "__sub__";
        case "*": return "__mul__";
        case "/": return "__div__";
        case "%": return "__mod__";
        case "<": return "__lt__";
        case ">": return "__gt__";
        case "<=": return "__le__";
        case ">=": return "__ge__";
        case ">>": return "__rshift__";
        case "<<": return "__lshift__";
        case "&": return "__band__";
        case "|": return "__bor__";
        case "^": return "__xor__";
        case "&&": return "__and__";
        case "||": return "__or__";
        case "!": return "__not__";
        case "~": return "__bnot__";
        case "[]": return "__index__";
        case "[-]": return "__reverse_index__";
        case "[]=": return "__index_set__";
        case "[-]=": return "__reverse_index_set__";
        case "()": return "__call__";
        case "++": return "__inc__";
        case "--": return "__dec__";
        default: 
            throw "Unreachable";
    }
}