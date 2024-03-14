import { UnaryExpression, UnaryOperator } from "../ast/expressions/UnaryExpression";
import { Context } from "../ast/symbol/Context";
import { BasicType } from "../ast/types/BasicType";
import { BooleanType } from "../ast/types/BooleanType";
import { ClassType } from "../ast/types/ClassType";
import { DataType } from "../ast/types/DataType";
import { InterfaceType } from "../ast/types/InterfaceType";
import { NullableType } from "../ast/types/NullableType";
import { isNeg, getOperatorOverloadType, setUnaryOverrideMethodHint, isNot, isBNot, isInc, isDec, OverridableMethodType, isPromise, getPromiseReturnType } from "./OperatorOverload";

// negation(-) requires a literal input and might elevate it toanother type
function inferNegative(ctx: Context, uhs: DataType, expr: UnaryExpression): DataType {
    if(uhs.is(ctx, ClassType) || uhs.is(ctx, InterfaceType)){
        if(isNeg(ctx, uhs as OverridableMethodType)){
            let method = getOperatorOverloadType(ctx, "__neg__", uhs as OverridableMethodType, []);
            if(method == null){
                throw ctx.parser.customError(`Cannot use - operator on type ${uhs.shortname()}, no operator overload found`, expr.location);
            }
            return setUnaryOverrideMethodHint(ctx, uhs, method, expr);
        }
    }


    if(!uhs.is(ctx, BasicType)){
        throw ctx.parser.customError(`Cannot use - operator on non-basic type ${uhs.shortname()}`, expr.location);
    }
    
    if(!(["u8" , "u16" , "u32" , "u64" , "i8" , "i16" , "i32" , "i64", "f32" , "f64"].includes(uhs.kind))){
        throw ctx.parser.customError(`Cannot use - operator on non-numeric type ${uhs.shortname()}`, expr.location);
    }

    if(uhs.kind == "u8"){
        return new BasicType(expr.location, "i8");
    }

    if(uhs.kind == "u16"){
        return new BasicType(expr.location, "i16");
    }

    if(uhs.kind == "u32"){
        return new BasicType(expr.location, "i32");
    }

    if(uhs.kind == "u64"){
        return new BasicType(expr.location, "i64");
    }

    return uhs;
}

// not(!) require a bool, int or nullable input, and always returns a bool
function inferNot(ctx: Context, uhs: DataType, expr: UnaryExpression): DataType {
    if(uhs.is(ctx, BasicType)){
        if (["i8", "i16", "i32", "i64", "u8" , "u16" , "u32" , "u64"].includes(uhs.kind)) {
            return new BooleanType(expr.location);
        }
    }
    if(uhs.is(ctx, BooleanType)){
        return uhs;
    }
    if(uhs.is(ctx, InterfaceType) || uhs.is(ctx, ClassType)){
        if(isNot(ctx, uhs as OverridableMethodType)){
            let method = getOperatorOverloadType(ctx, "__not__", uhs as OverridableMethodType, []);
            if(method == null){
                throw ctx.parser.customError(`Cannot use ! operator on type ${uhs.shortname()}, no operator overload found`, expr.location);
            }
            return setUnaryOverrideMethodHint(ctx, uhs, method, expr);
        }
    }
    if(uhs.is(ctx, NullableType)){
        return new BooleanType(expr.location);
    }
    throw ctx.parser.customError(`Cannot use ! operator on type ${uhs.shortname()}`, expr.location);
}

// denull(!!) requires a nullable input and returns a non-nullable version of it
function inferDenull(ctx: Context, uhs: DataType, expr: UnaryExpression): DataType {
    if(!uhs.is(ctx, NullableType)){
        throw ctx.parser.customError(`Cannot use !! operator on non-nullable type ${uhs.shortname()}`, expr.location);
    }
    return (uhs.to(ctx, NullableType) as NullableType).type;
}

// bitwise not(~) requires an integer input and returns an integer
function inferBitwiseNot(ctx: Context, uhs: DataType, expr: UnaryExpression): DataType {
    if(uhs.is(ctx, InterfaceType) || uhs.is(ctx, ClassType)){
        if(isBNot(ctx, uhs as OverridableMethodType)){
            let method = getOperatorOverloadType(ctx, "__bnot__", uhs as OverridableMethodType, []);
            if(method == null){
                throw ctx.parser.customError(`Cannot use ~ operator on type ${uhs.shortname()}, no operator overload found`, expr.location);
            }
            return setUnaryOverrideMethodHint(ctx, uhs, method, expr);
        }
    }
    if(!uhs.is(ctx, BasicType)){
        throw ctx.parser.customError(`Cannot use ~ operator on non-basic type ${uhs.shortname()}`, expr.location);
    }
    if(!(["i8", "i16", "i32", "i64", "u8" , "u16" , "u32" , "u64"].includes(uhs.kind))){
        throw ctx.parser.customError(`Cannot use ~ operator on non-numeric type ${uhs.shortname()}`, expr.location);
    }

    return uhs;
}

// increment(++)/decrement(--) prefix and suffix, both requires an integer input and returns an integer
function inferIncrementDecrement(ctx: Context, uhs: DataType, expr: UnaryExpression): DataType {
    if(uhs.is(ctx, InterfaceType) || uhs.is(ctx, ClassType)){
        if(isInc(ctx, uhs as OverridableMethodType) && (expr.operator == "post++" || expr.operator == "pre++")){
            let method = getOperatorOverloadType(ctx, "__inc__", uhs as OverridableMethodType, []);
            if(method == null){
                throw ctx.parser.customError(`Cannot use ++ operator on type ${uhs.shortname()}, no operator overload found`, expr.location);
            }
            return setUnaryOverrideMethodHint(ctx, uhs, method, expr);
        }
        if(isDec(ctx, uhs as OverridableMethodType) && (expr.operator == "post--" || expr.operator == "pre--")){
            let method = getOperatorOverloadType(ctx, "__dec__", uhs as OverridableMethodType, []);
            if(method == null){
                throw ctx.parser.customError(`Cannot use -- operator on type ${uhs.shortname()}, no operator overload found`, expr.location);
            }
            return setUnaryOverrideMethodHint(ctx, uhs, method, expr);
        }
    }
    
    if(!(uhs instanceof BasicType)){
        throw ctx.parser.customError(`Cannot use ++/-- operator on non-basic type ${uhs.shortname()}`, expr.location);
    }
    if(!(["u8" , "u16" , "u32" , "u64" , "i8" , "i16" , "i32" , "i64"].includes(uhs.kind))){
        throw ctx.parser.customError(`Cannot use ++/-- operator on non-numeric type ${uhs.shortname()}`, expr.location);
    }

    return uhs;
}

// await requires a promise input and returns the type of the promise
function inferAwait(ctx: Context, uhs: DataType, expr: UnaryExpression): DataType {
    if(uhs.is(ctx, ClassType) || uhs.is(ctx, InterfaceType)){
        if(isPromise(ctx, uhs as OverridableMethodType)){
            return getPromiseReturnType(ctx, uhs as OverridableMethodType);
        }
    }

    throw ctx.parser.customError(`Cannot use await operator on non-promise type ${uhs.shortname()}`, expr.location);
}

type UnaryTypeChecker = (ctx: Context, uhsType: DataType, expr: UnaryExpression) => DataType;

export const unaryTypeCheckers: Record<UnaryOperator, UnaryTypeChecker> = {
    "-": inferNegative,
    "!": inferNot,
    "!!": inferDenull,
    "~": inferBitwiseNot,
    "pre++": inferIncrementDecrement,
    "post++": inferIncrementDecrement,
    "pre--": inferIncrementDecrement,
    "post--": inferIncrementDecrement,
    "await": inferAwait
}