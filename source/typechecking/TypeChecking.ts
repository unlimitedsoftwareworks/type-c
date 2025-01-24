/**
 * Filename: TypeChecking.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     performs type checking and compatibility
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Expression } from "../ast/expressions/Expression";
import { Context } from "../ast/symbol/Context";
import { FunctionArgument } from "../ast/symbol/FunctionArgument";
import { ArrayType } from "../ast/types/ArrayType";
import { BasicType, BasicTypeKind } from "../ast/types/BasicType";
import { BooleanType } from "../ast/types/BooleanType";
import { ClassType } from "../ast/types/ClassType";
import { DataType } from "../ast/types/DataType";
import { EnumType } from "../ast/types/EnumType";
import { FFIMethodType } from "../ast/types/FFIMethodType";
import { FunctionType } from "../ast/types/FunctionType";
import { GenericType } from "../ast/types/GenericType";
import { InterfaceType } from "../ast/types/InterfaceType";
import { JoinType } from "../ast/types/JoinType";
import { LiteralIntType } from "../ast/types/LiteralNumberType";
import { NullType } from "../ast/types/NullType";
import { NullableType } from "../ast/types/NullableType";
import { StructField, StructType } from "../ast/types/StructType";
import { TupleType } from "../ast/types/TupleType";
import { UnionType } from "../ast/types/UnionType";
import { UnsetType } from "../ast/types/UnsetType";
import { VariantConstructorType } from "../ast/types/VariantConstructorType";
import { VariantType } from "../ast/types/VariantType";
import { VoidType } from "../ast/types/VoidType";
import { CoroutineType } from "../ast/types/CoroutineType";
import { getDataTypeByteSize } from "../codegenerator/utils";
import { InterfaceMethod } from "../ast/other/InterfaceMethod";
import { UnreachableType } from "../ast/types/UnreachableType";
import { BuiltinModules } from "../BuiltinModules";
import { StringEnumType } from "../ast/types/StringEnumType";


export type TypeMatchResult = {
    success: boolean,
    message?: string
}

export function Ok(): TypeMatchResult {
    return { success: true };
}

export function Err(message: string): TypeMatchResult {
    return { success: false, message: message };
}

function generateTypeKey(t1: DataType, t2: DataType, strict: boolean): string {
    if (t1 === undefined) {
        console.log('t1 is null')
    }
    return `${t1.hash()}-${t2.hash()}-${strict}`;
}

export class TypeMatchCache {
    static typeMatchCache = new WeakMap<Context, Map<string, TypeMatchResult>>();
    static globalMatchingStack: string[] = [];

    static reset() {
        TypeMatchCache.typeMatchCache = new WeakMap<Context, Map<string, TypeMatchResult>>();
        TypeMatchCache.globalMatchingStack = [];
    }
}

/**
 * Checks if `et` is (or compatible with `t2`).
 * For example: let x: interface{} = new Class(), calls
 * matchDataTypes(ctx, interface{}, new Class()) should return true.
 * @param ctx active context
 * @param t1 type 1
 * @param t2 type 2
 * @param strict 
 * @returns true if et is compatible with dt, i.e et is or a subtype of dt
 */
export function matchDataTypes(ctx: Context, et: DataType, dt: DataType, strict: boolean = true): TypeMatchResult {
    if (TypeMatchCache.globalMatchingStack.includes(generateTypeKey(et, dt, strict))) {
        return Ok();
    }
    TypeMatchCache.globalMatchingStack.push(generateTypeKey(et, dt, strict));

    let res = matchDataTypesRecursive(ctx, et, dt, et.isStrict() || strict, []);
    TypeMatchCache.globalMatchingStack.pop();
    return res;
}

/**
 * A recursive check, takes into account recursive types, hence the `stack` parameter.
 * @param ctx 
 * @param et 
 * @param dt 
 * @param strict 
 * @param stack 
 * @returns 
 */
export function matchDataTypesRecursive(ctx: Context, t1: DataType, t2: DataType, strict: boolean = false, stack: string[] = []): TypeMatchResult {

    /**
     * 2. We generate a type-key to avoid inifnite recursion and also
     * to cache the results of the type matching. 
     */
    const typeKey = generateTypeKey(t1, t2, strict);
    if (stack.includes(typeKey)) {
        return Ok();
    }

    let scopeCache = TypeMatchCache.typeMatchCache.get(ctx);
    if (!scopeCache) {
        scopeCache = new Map<string, TypeMatchResult>();
        TypeMatchCache.typeMatchCache.set(ctx, scopeCache);
    }

    if (scopeCache.has(typeKey)) {
        return scopeCache.get(typeKey)!;
    }

    stack.push(typeKey);


    t1.resolve(ctx);
    t2.resolve(ctx);

    /**
     * 3. We check if the types are the same
     */

    let res = Ok();

    if(t1 instanceof UnreachableType || t2 instanceof UnreachableType){
        scopeCache.set(typeKey, res);
        return res;
    }


    // Nullable pushed on the top because Nullable<Class>.is(ClassType) == true
    // so we first check if t1 is nullable
    // case 4: null types, a null can be only assigned a null
    if (t1.is(ctx, NullType)) {
        if (!(t2.is(ctx, NullType))) {
            res = Err(`Type mismatch, expected null, got ${t2.getShortName()}`);
        }
        scopeCache.set(typeKey, res);
        return res;
    }

    // case 5: nullable, nullable<T> can be assigned a value of type T or null
    if (t1.is(ctx, NullableType)) {
        if (t2.is(ctx, NullableType)) {
            res = matchDataTypesRecursive(ctx, (t1.to(ctx, NullableType) as NullableType).type, (t2.to(ctx, NullableType) as NullableType).type, strict, stack);
            scopeCache.set(typeKey, res);
            return res;
        }
        else if (t2.is(ctx, NullType)) {
            scopeCache.set(typeKey, res);
            return res;
        }
        else {
            // if t1 is nullable and t2 is not, we match t1.type with t2
            let t1Type = (t1.to(ctx, NullableType) as NullableType).type;
            res = matchDataTypesRecursive(ctx, t1Type, t2, strict, stack);
            scopeCache.set(typeKey, res);
            return res;
        }
    }

    if(t2.is(ctx, NullableType)){
        res = Err(`Cannot match non-nullable type ${t1.getShortName()} with nullable type ${t2.getShortName()}`);
        scopeCache.set(typeKey, res);
        return res;
    }

    // case 1: void types
    if (t1.is(ctx, VoidType)) {
        // make sure t2 is also a void type
        if (!(t2 instanceof VoidType)) {
            res = Err(`Type mismatch, expected void, got ${t2.getShortName()}`);
            scopeCache.set(typeKey, res);
        }

        return res;
    }

    // case 2: basic data types (integers, floats and doubles)
    if (t1.is(ctx, BasicType)) {
        if (t2.is(ctx, LiteralIntType)) {
            res = matchBasicLiteralIntType(ctx, t1.to(ctx, BasicType) as BasicType, t2.to(ctx, LiteralIntType) as LiteralIntType, strict);
            scopeCache.set(typeKey, res);
            return res;
        }


        if (t2.is(ctx, EnumType)) {
            return matchBasicTypes(ctx, t1, new BasicType(t2.location, (t2.to(ctx, EnumType) as EnumType).as as BasicTypeKind), strict);
        }

        if (!t2.is(ctx, BasicType)) {
            res = Err(`Type mismatch, expected ${t1.getShortName()}, got ${t2.getShortName()}`);
            scopeCache.set(typeKey, res);
            return res;
        }

        if (t1.kind === t2.kind) {
            scopeCache.set(typeKey, res);
            return res;
        }
        else {
            res = matchBasicTypes(ctx, t1.to(ctx, BasicType) as BasicType, t2.to(ctx, BasicType) as BasicType, strict);
            scopeCache.set(typeKey, res);
            return res;
        }
    }

    // case 2: boolean
    if (t1.is(ctx, BooleanType)) {
        if (!(t2.is(ctx, BooleanType))) {
            res = Err(`Type mismatch, expected boolean, got ${t2.getShortName()}`);
        }

        scopeCache.set(typeKey, res);
        return res;
    }

    // case 3: array type

    if (t1.is(ctx, ArrayType)) {
        if (!(t2.is(ctx, ArrayType))) {
            res = Err(`Type mismatch, expected array, got ${t2.getShortName()}`);
        }
        else {
            res = matchDataTypesRecursive(ctx, (t1.to(ctx, ArrayType) as ArrayType).arrayOf, (t2.to(ctx, ArrayType) as ArrayType).arrayOf, strict, stack);
        }
        scopeCache.set(typeKey, res);
        return res;
    }


    /**
     * case 6: Enum types
     * an enum type can be assigned a value of the same enum type or a literal integer type
     * if the type allows it. Also if strict is enabled, t2 must be an enum type, and not 
     * an integer.
     */
    if (t1.is(ctx, EnumType)) {
        if (t2.is(ctx, EnumType)) {
            res = matchEnumTypes(ctx, t1.to(ctx, EnumType) as EnumType, t2.to(ctx, EnumType) as EnumType, strict);
            scopeCache.set(typeKey, res);
            return res;
        }
        if ((t2.is(ctx, LiteralIntType)) && (!strict)) {
            scopeCache.set(typeKey, res);
            return res;
        }

        if (t2.is(ctx, BasicType)) {
            return matchBasicTypes(ctx, new BasicType(t1.location, (t1.to(ctx, EnumType) as EnumType).as as BasicTypeKind), t2.to(ctx, BasicType) as BasicType, strict);
        }

        let te = t1.to(ctx, EnumType) as EnumType;
        res = Err(`Type mismatch, expected enum with fields ${te.fields.map(e => e.name).join(", ")}, got ${t2.getShortName()}`);
        scopeCache.set(typeKey, res);
        return res
    }

    if(t1.is(ctx, StringEnumType)) {
        if(t2.is(ctx, StringEnumType)) {
            res = matchStringEnumTypes(ctx, t1.to(ctx, StringEnumType) as StringEnumType, t2.to(ctx, StringEnumType) as StringEnumType, strict);
            scopeCache.set(typeKey, res);
            return res;
        }
        else {
            res = Err(`Type mismatch, expected string enum, got ${t2.getShortName()}`);
            scopeCache.set(typeKey, res);
            return res;
        }
    }


    /**
     * case 7: FFIMethodType
     * we should not be performing type matching on FFI methods
     * since they are only used to call method and should not be passed around
     */
    if (t1.is(ctx, FFIMethodType)) {
        res = Err("Cannot perform type matching on FFI methods");
        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 8: FunctionType
     * two functions are compatible if they have the same signature
     */
    if (t1.is(ctx, FunctionType)) {
        if (!t2.is(ctx, FunctionType)) {
            res = Err(`Type mismatch, expected function, got ${t2.getShortName()}`);
            scopeCache.set(typeKey, res);
            return res;
        }
        res = matchFunctionType(ctx, t1.to(ctx, FunctionType) as FunctionType, t2.to(ctx, FunctionType) as FunctionType, stack, strict);
        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 9: GenericType
     * should not be reached, since generic types are not resolved until concrete types are provided
     */
    if (t1 instanceof GenericType) {
        throw new Error("Cannot perform type matching on generic types");
    }

    /**
     * case 10: LiteralIntType
     */
    if (t1.is(ctx, LiteralIntType)) {
        if (!t2.is(ctx, BasicType)) {
            res = Err(`Type mismatch, expected basic type, got ${t2.getShortName()}`);
            scopeCache.set(typeKey, res);
            return res;
        }
        // TODO: maybe swapping ain't enough
        res = matchBasicLiteralIntType(ctx, t2, t1.to(ctx, LiteralIntType) as LiteralIntType, strict);
        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 11: InterfaceType,
     * an interface is only compatible with another interface, or a class that implements its methods
     */
    if (t1.is(ctx, InterfaceType)) {
        if (t2.is(ctx, InterfaceType)) {
            res = matchInterfaces(ctx, t1.to(ctx, InterfaceType) as InterfaceType, t2.to(ctx, InterfaceType) as InterfaceType, strict, stack);
            scopeCache.set(typeKey, res);
            return res;
        }
        if (t2.is(ctx, ClassType)) {
            res = matchInterfaceClass(ctx, t1.to(ctx, InterfaceType) as InterfaceType, t2.to(ctx, ClassType) as ClassType, strict, stack);
            scopeCache.set(typeKey, res);
            return res;
        }
        res = Err(`Type mismatch, expected interface, got ${t2.getShortName()}`);
        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 12: ClassType
     * a class is only compatible with another class with the exact same structure both attributes and methods
     */
    if (t1.is(ctx, ClassType)) {
        if(isStringClass(ctx, t1)) {
            if(t2.is(ctx, StringEnumType)) {
                // its a match!
                scopeCache.set(typeKey, res);
                return res;
            }
        }

        if (!t2.is(ctx, ClassType)) {
            res = Err(`Type mismatch, expected class, got ${t2.getShortName()}`);
            scopeCache.set(typeKey, res);
            return res;
        }

        res = matchClasses(ctx, t1, t2, strict, stack);
        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 13: JoinType
     * commented because now Join is recognized as an interface thanks to new .is(InterfaceType) and .to(InterfaceType)
     
    if(t1 instanceof JoinType) {
        // a join type is the same as an interface
        return matchJoinType(ctx, t1, t2, strict, stack);
    }
    */


    /**
     * case 16: UnionType, unions are only used to model generic type constraints, hence we should not be here
     */
    if (t1 instanceof UnionType) {
        throw new Error("Union types should not be here");
    }

    /**
     * case 17: VariantType, a variant type is only compatible with another variant type with the exact same structure, 
     * or a constructor of the variant type
     */
    if (t1.is(ctx, VariantType)) {
        if (t2.is(ctx, VariantType)) {
            res = matchVariants(ctx, t1.to(ctx, VariantType) as VariantType, t2.to(ctx, VariantType) as VariantType, strict, stack);
        }
        else if (t2.is(ctx, VariantConstructorType)) {
            res = matchVariantWithConstructor(ctx, t1.to(ctx, VariantType) as VariantType, t2.to(ctx, VariantConstructorType) as VariantConstructorType, strict, stack);
        }
        else {
            res = Err(`Type mismatch, expected variant or variant constructor type of base tyep ${(t1.to(ctx, VariantType) as VariantType).getShortName()}, got ${t2.getShortName()}`);
        }
        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 18: VariantConstructorType, a variant constructor is only compatible with another variant constructor
     *  with the exact same structure
     */
    if (t1.is(ctx, VariantConstructorType)) {
        if (!t2.is(ctx, VariantConstructorType)) {
            res = Err(`Type mismatch, expected variant constructor, got ${t2.getShortName()}`);
        }
        else {
            res = matchVariantConstructors(ctx, t1.to(ctx, VariantConstructorType) as VariantConstructorType, t2.to(ctx, VariantConstructorType) as VariantConstructorType, strict, stack);
        }

        scopeCache.set(typeKey, res);
        return res;
    }


    if (t1.is(ctx, StructType)) {
        if (!(t2.is(ctx, StructType))) {
            res = Err(`Type mismatch, expected struct, got ${t2.getShortName()}`);
        }
        else {
            res = matchStructs(ctx, t1.to(ctx, StructType) as StructType, t2.to(ctx, StructType) as StructType, strict, stack);
        }

        scopeCache.set(typeKey, res);
        return res;
    }

    if (t1.is(ctx, TupleType)) {
        if (!(t2.is(ctx, TupleType))) {
            res = Err(`Type mismatch, expected tuple, got ${t2.getShortName()}`);
        }
        else {
            res = matchTuples(ctx, t1.to(ctx, TupleType) as TupleType, t2.to(ctx, TupleType) as TupleType, strict, stack);
        }

        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 19: UnsetType
     * an unset type is used for methods who's return type is not set, hence we should not be here
     */
    if (t1 instanceof UnsetType) {
        throw new Error("Unset types should not be here");
    }

    /**
     * case 20: CoroutineType
     * a coroutine is only compatible with another coroutine, where both of their function types are compatible
     */
    if (t1.is(ctx, CoroutineType)) {
        if (!t2.is(ctx, CoroutineType)) {
            res = Err(`Type mismatch, expected coroutine, got ${t2.getShortName()}`);
        }
        else {
            res = matchDataTypesRecursive(ctx, (t1.to(ctx, CoroutineType) as CoroutineType).fnType, (t2.to(ctx, CoroutineType) as CoroutineType).fnType, strict, stack);
        }
        scopeCache.set(typeKey, res);
        return res;
    }

    res = Err(`Type mismatch, ${t1.getShortName()} and ${t2.getShortName()} are not compatible`);
    scopeCache.set(typeKey, res);
    return res;
}

function matchBasicTypes(ctx: Context, t1: BasicType, t2: BasicType, strict: boolean): TypeMatchResult {
    if (strict) {
        if (t1.kind === t2.kind) {
            return Ok();
        } else {
            return Err(`Type mismatch, expected ${t1.getShortName()}, got ${t2.getShortName()}`);
        }
    }

    if (t1.kind === t2.kind) {
        return Ok();
    }
    if (strict && (t1.kind !== t2.kind)) {
        return Err(`Type mismatch, expected ${t1.getShortName()}, got ${t2.getShortName()}`);
    }

    // Define an ordered list for numeric types.
    const unsignedInts = ["u8", "u16", "u32", "u64"];
    const signedInts = ["i8", "i16", "i32", "i64"];
    const floats = ["f32", "f64"];

    // Check for safe casting from unsigned to signed where the signed type is larger.
    if (unsignedInts.includes(t1.kind) && signedInts.includes(t2.kind)) {
        // Find the sizes of each type to compare their capacities.
        const t1Index = unsignedInts.indexOf(t1.kind);
        const t2Index = signedInts.indexOf(t2.kind);
        // Allow casting if the signed type has equal or more capacity than the unsigned type.
        // Assuming each step in the arrays represents a doubling in capacity.
        if (t2Index >= t1Index + 1) {
            return Ok();
        } else {
            return Err(`Type mismatch, cannot safely cast ${t1.getShortName()} to ${t2.getShortName()}`);
        }
    }


    // Check for safe casting from unsigned to signed where the signed type is larger.
    if (unsignedInts.includes(t2.kind) && signedInts.includes(t1.kind)) {
        // Find the sizes of each type to compare their capacities.
        const t1Index = unsignedInts.indexOf(t2.kind);
        const t2Index = signedInts.indexOf(t1.kind);
        // Allow casting if the signed type has equal or more capacity than the unsigned type.
        // Assuming each step in the arrays represents a doubling in capacity.
        if (t2Index >= t1Index + 1) {
            return Ok();
        } else {
            return Err(`Type mismatch, cannot safely cast ${t1.getShortName()} to ${t2.getShortName()}`);
        }
    }

    // Existing checks for unsigned and signed integer ranges within their own types
    if (unsignedInts.includes(t1.kind) && unsignedInts.includes(t2.kind)) {
        if (unsignedInts.indexOf(t1.kind) >= unsignedInts.indexOf(t2.kind)) {
            return Ok();
        } else {
            return Err(`Type mismatch, expected ${t1.getShortName()}, got ${t2.getShortName()}`);
        }
    }

    if (signedInts.includes(t1.kind) && signedInts.includes(t2.kind)) {
        if (signedInts.indexOf(t1.kind) >= signedInts.indexOf(t2.kind)) {
            return Ok();
        } else {
            return Err(`Type mismatch, expected ${t1.getShortName()}, got ${t2.getShortName()}`);
        }
    }

    // Checks for floats remain unchanged
    if (floats.includes(t1.kind) && floats.includes(t2.kind)) {
        if (floats.indexOf(t1.kind) >= floats.indexOf(t2.kind)) {
            return Ok();
        } else {
            return Err(`Type mismatch, expected ${t1.getShortName()}, got ${t2.getShortName()}`);
        }
    }

    const is32bitsOrSmaller = (t: string) => (t === "u32" || t === "i32" || t === "f32" || t === "u16" || t === "i16" || t === "f16" || t === "u8" || t === "i8");
    const is64bitsOrSmaller = (t: string) => (t === "u64" || t === "i64" || t === "f64" || is32bitsOrSmaller(t));

    // allow casting from f32 to u32 or i32
    if(t1.kind === "f32" && is32bitsOrSmaller(t2.kind)) {
        return Ok();
    }

    // allow casting from f64 to u64 or i64
    if(t1.kind === "f64" && is64bitsOrSmaller(t2.kind)) {
        return Ok();
    }

    // allow casting from u32 or i32 to f32
    if((t1.kind === "u32" || t1.kind === "i32") && t2.kind === "f32") {
        return Ok();
    }

    // allow casting from u64 or i64 to f64
    if((t1.kind === "u64" || t1.kind === "i64") && t2.kind === "f64") {
        return Ok();
    }

    // All other combinations are incompatible.
    return Err(`Type mismatch, unexpected combination of ${t1.getShortName()} and ${t2.getShortName()}`);
}

function matchStringEnumTypes(ctx: Context, t1: StringEnumType, t2: StringEnumType, strict: boolean): TypeMatchResult {
    let fields1 = t1.values;
    let fields2 = t2.values;

    if(fields1.length < fields2.length) {
        return Err(`Type mismatch, expected string enum with ${fields1.length} fields, got ${fields2.length}`);
    }

    // make sure all fields of t2 are in t1
    for(let field of fields2) {
        if(!fields1.includes(field)) {
            return Err(`Type mismatch, field ${field} present in ${t2.getShortName()} not found in ${t1.getShortName()}`);
        }
    }

    return Ok();
}

function matchEnumTypes(ctx: Context, t1: EnumType, t2: EnumType, strict: boolean): TypeMatchResult {
    // if strict is enabled, the types must be the same and not just compatible
    let t1Fields = t1.fields;
    let t2Fields = t2.fields;

    if (t1Fields.length !== t2Fields.length) {
        return Err(`Type mismatch, expected enum with fields ${t1Fields.map(e => e.name).join(", ")}, got ${t2Fields.map(e => e.name).join(", ")}`);
    }

    for (let i = 0; i < t1Fields.length; i++) {
        let f1 = t1Fields[i];
        let f2 = t2Fields[i];

        if (f1.name !== f2.name) {
            return Err(`Type mismatch, expected enum with fields ${t1Fields.map(e => e.name).join(", ")}, got ${t2Fields.map(e => e.name).join(", ")}`);
        }

        if (f1.value !== f2.value) {
            return Err(`Type mismatch, enum field ${f1.name} has different values (${f1.value} and ${f2.value})`);
        }
    }

    return Ok();
}

function matchBasicLiteralIntType(ctx: Context, t1: BasicType, t2: LiteralIntType, strict: boolean): TypeMatchResult {
    // TODO: use _byteSize information of literal type to make sure the literal type is compatible with the basic type
    return Ok();
}

/**
 * Matches two function types. Function types are compatible if:
 * 1. they have the same number of parameters
 * 2. each parameter in t1 is exactly the same as the parameter in t2
 * 3. the return type of t1 is exactly the same as the return type of t2
 * @param ctx 
 * @param t1 
 * @param t2 
 * @param stack 
 * @param strict 
 * @returns 
 */
function matchFunctionType(ctx: Context, t1: FunctionType, t2: FunctionType, stack: string[], strict: boolean): TypeMatchResult {
    if (t1.parameters.length != t2.parameters.length) {
        return Err(`Function parameter counts do not match, ${t1.parameters.length} and ${t2.parameters.length} are not compatible`)
    }

    for (let i = 0; i < t1.parameters.length; i++) {
        if (t1.parameters[i].isMutable != t2.parameters[i].isMutable) {
            return Err(`Function parameter ${i} mutability does not match, ${(t1.parameters[i].isMutable ? "mut " : "const ") +
                t1.parameters[i].name} and ${(t2.parameters[i].isMutable ? "mut " : "const ") + t2.parameters[i].name} are not compatible`)
        }
        let res = matchDataTypesRecursive(ctx, t2.parameters[i].type, t1.parameters[i].type, true, stack)
        if (!res.success) {
            return Err(`Function parameter ${i} types do not match: ${res.message}`);
        }
    }
    // make sure return type matches, and all parameters match
    if (t1.returnType == null) {
        if (t2.returnType != null) {
            return Err(`Function return types do not match, ${t1.returnType} and ${t2.returnType} are not compatible`)
        }
    }
    else {
        /**
         * Same as with classes findMethodBySignature, we can accept a return type that unset
         */
        if (t1.returnType.is(ctx, UnsetType) || t2.returnType.is(ctx, UnsetType)) {
            return Ok();
        }
        let res = matchDataTypesRecursive(ctx, t1.returnType, t2.returnType as DataType, true, stack)
        if (!res.success) {
            return Err(`Function return types do not match: ${res.message}`)
        }
    }


    return Ok();
}

function matchInterfaces(ctx: Context, t1: InterfaceType, t2: InterfaceType, strict: boolean, stack: string[]): TypeMatchResult {
    /**
     * t1 is or compatible with t2 if:
     *  1. t2 has all the methods of t1
     */
    let t1Methods = t1.methods;
    let t2Methods = t2.methods;

    if (strict) {
        if (t1Methods.length !== t2Methods.length) {
            return Err(`Type mismatch, expected interface with ${t1Methods.length} methods, got ${t2Methods.length}`);
        }
    }
    else {
        if (t1Methods.length > t2Methods.length) {
            return Err(`Type mismatch, expected interface with at most ${t1Methods.length} methods, got ${t2Methods.length}`);
        }
    }

    // every method of t1 must match exactly one in t2
    for (let method of t1Methods) {
        let found = false;
        for (let method2 of t2Methods) {
            if (method.name === method2.name) {
                let res = matchFunctionType(ctx, method.header, method2.header, stack, strict);
                if (!res.success) {
                    return res;
                }
                found = true;
                break;
            }
        }
        if (!found) {
            return Err(`Method ${method.name} not found in interface ${t2.getShortName()}`);
        }
    }

    return Ok();
}

function matchInterfaceClass(ctx: Context, t1: InterfaceType, t2: ClassType, strict: boolean, stack: string[]): TypeMatchResult {
    let t1Methods = t1.methods;
    let t2Methods = t2.methods.map(e => e.imethod);

    if (strict) {
        if (t1Methods.length > t2Methods.length) {
            return Err(`Type mismatch, expected interface with at most ${t1Methods.length} methods, got ${t2Methods.length}`);
        }
    }

    // every method of t1 must match exactly one in t2
    /*
    for(let method of t1Methods) {
        let found = false;
        for(let method2 of t2Methods) {
            if(method.name === method2.name) {
                let res = matchFunctionType(ctx, method.header, method2.header, stack, strict);
                if(!res.success) {
                    return res;
                }
                found = true;
                break;
            }
        }
        if(!found) {
            return Err(`Method ${method.name} not found in class ${t2.getShortName()}`);
        }
    }*/

    for (let method of t1Methods) {
        // method is from the interface, we try and find it in the class
        let m = t2.getMethodBySignature(ctx, method.name, method.header.parameters.map(e => e.type), method.header.returnType, []);
        if (m.length === 0) {
            return Err(`Method ${method.getShortName()} not found in class ${t2.getShortName()}`);
        }
        else if (m.length > 1) {
            return Err(`Ambiguous method ${method.getShortName()} in class ${t2.getShortName()}`);
        }
        // OK!
    }

    return Ok();
}

function matchClasses(ctx: Context, ct1: DataType, ct2: DataType, strict: boolean, stack: string[]): TypeMatchResult {
    /**
     * Some times, classes are not resolved due to circular dependencies, so we resolve them here
     */
    let t1 = ct1.to(ctx, ClassType) as ClassType;
    let t2 = ct2.to(ctx, ClassType) as ClassType

    t1.resolve(ctx);
    t2.resolve(ctx);

    if (t1.classId !== t2.classId) {
        return Err(`Type mismatch, classes ${t1.getShortName()} and ${t2.getShortName()} are not compatible`);
    }


    return Ok();
}

function matchJoinType(ctx: Context, t1: JoinType, t2: DataType, strict: boolean, stack: string[]): TypeMatchResult {
    throw new Error("Not implemented");
}

// matches two variants
function matchVariants(ctx: Context, t1: VariantType, t2: VariantType, strict: boolean, stack: string[]): TypeMatchResult {
    let t1Constructors = t1.constructors;
    let t2Constructors = t2.constructors;

    if (strict) {
        if (t1Constructors.length !== t2Constructors.length) {
            return Err(`Type mismatch, expected variant with ${t1Constructors.length} constructors, got ${t2Constructors.length}`);
        }
    }
    else {
        if (t1Constructors.length > t2Constructors.length) {
            return Err(`Type mismatch, expected variant with at most ${t1Constructors.length} constructors, got ${t2Constructors.length}`);
        }
    }

    // every constructor of t1 must match exactly one in t2 and in the same order
    for (let i = 0; i < t1Constructors.length; i++) {
        let constructorLHS = t1Constructors[i];
        let constructorRHS = t2Constructors[i];
        let res = matchVariantConstructors(ctx, constructorLHS, constructorRHS, strict, stack);
        if (!res.success) {
            return res;
        }
    }

    return Ok();
}

// matches a variant with a constructor
function matchVariantWithConstructor(ctx: Context, t1: VariantType, t2: VariantConstructorType, strict: boolean, stack: string[]): TypeMatchResult {
    /**
     * A variant and a variant constructor matches if the variant has a constructor matching the constructor t2
     */
    let t1Constructors = t1.constructors;
    for (let constructor of t1Constructors) {
        let res = matchVariantConstructors(ctx, constructor, t2, strict, stack);
        if (res.success) {
            return res;
        }
    }

    return Err(`Constructor ${t2.name} not found in variant ${t1.getShortName()}`);
}

// matches two variant constructors
function matchVariantConstructors(ctx: Context, t1: VariantConstructorType, t2: VariantConstructorType, strict: boolean, stack: string[]): TypeMatchResult {
    /**
     * A variant constructor matches another variant constructor if:
     * 1. they have the same name
     * 2. they have the same number of parameters
     * 3. the types of the parameters match
     */

    if (t1.name !== t2.name) {
        return Err(`Constructor names do not match, expected ${t1.name}, got ${t2.name}`);
    }

    if (t1.parameters.length !== t2.parameters.length) {
        return Err(`Constructor parameter counts do not match, ${t1.parameters.length} and ${t2.parameters.length} are not compatible`);
    }

    for (let i = 0; i < t1.parameters.length; i++) {
        let p1 = t1.parameters[i];
        let p2 = t2.parameters[i];
        let res = matchDataTypesRecursive(ctx, p1.type, p2.type, strict, stack);
        if (!res.success) {
            return Err(`Constructor parameter ${i} types do not match: ${res.message}`);
        }
    }

    return Ok();
}

function matchStructs(ctx: Context, t1: StructType, t2: StructType, strict: boolean, stack: string[]): TypeMatchResult {
    let t1Fields = t1.fields;
    let t2Fields = t2.fields;

    let res = reduceStructFields(ctx, t2Fields, strict, stack);
    if (!res.err.success) {
        return res.err;
    }
    t2Fields = res.fields;


    if (t1Fields.length > t2Fields.length) {
        return Err(`Type mismatch, expected struct with at most ${t1Fields.length} fields, got ${t2Fields.length}`);
    }


    // every field of t1 must match exactly one in t2
    for (let field of t1Fields) {
        let found = false;
        for (let field2 of t2Fields) {
            if (field.name === field2.name) {
                let res = matchDataTypesRecursive(ctx, field.type, field2.type, strict, stack);
                if (!res.success) {
                    return Err(`Field ${field.name} types do not match: ${res.message}: ${res.message}`);
                }
                found = true;
                break;
            }
        }
        if (!found) {
            return Err(`Field ${field.name} not found in struct ${t2.getShortName()}`);
        }
    }
    //}


    return Ok();
}

function matchTuples(ctx: Context, t1: TupleType, t2: TupleType, strict: boolean, stack: string[]): TypeMatchResult {
    let t1Fields = t1.types;
    let t2Fields = t2.types;

    if (strict) {
        if (t1Fields.length !== t2Fields.length) {
            return Err(`Type mismatch, expected tuple with ${t1Fields.length} fields, got ${t2Fields.length}`);
        }
    }
    else {
        if (t1Fields.length > t2Fields.length) {
            return Err(`Type mismatch, expected tuple with at most ${t1Fields.length} fields, got ${t2Fields.length}`);
        }
    }

    // every field of t1 must match exactly one in t2
    for (let i = 0; i < t1Fields.length; i++) {
        let field = t1Fields[i];
        let field2 = t2Fields[i];
        let res = matchDataTypesRecursive(ctx, field, field2, strict, stack);
        if (!res.success) {
            return Err(`Field ${i} types do not match: ${res.message}`);
        }
    }

    return Ok();
}

/**
 * Checks if two function types are identical.
 * this is used for classes/interfaces to make sure overloaded methods
 * are not identical.
 * @param ctx context
 * @param a first method
 * @param b second method
 * @returns 
 */
export function areSignaturesIdentical(ctx: Context, a: InterfaceMethod, b: InterfaceMethod): boolean {
    // first, check if the number of parameters is the same
    if (a.header.parameters.length !== b.header.parameters.length) return false;

    // for generics, the signature checks will be done later
    // when all generic methods are instantiated
    if(a.isGeneric() || b.isGeneric()){
        return false;
    }

    // return type do not matter when overloading methods, so we check parameter types
    /*
    let aGenerics = a.generics.map(e => e.name);
    let bGenerics = b.generics.map(e => e.name);
    */
    for (let i = 0; i < a.header.parameters.length; i++) {
        if (!areDataTypesIdentical(ctx, a.header.parameters[i].type, b.header.parameters[i].type)) {
            return false;
        }
    }

    return true;
}

export function areOverloadedFunctionsIdentical(ctx: Context, a: FunctionType, b: FunctionType): boolean {
    // first, check if the number of parameters is the same
    if (a.parameters.length !== b.parameters.length) return false;


    // return type do not matter when overloading methods, so we check parameter types
    /*
    let aGenerics = a.generics.map(e => e.name);
    let bGenerics = b.generics.map(e => e.name);
    */
    for (let i = 0; i < a.parameters.length; i++) {
        if (!areDataTypesIdentical(ctx, a.parameters[i].type, b.parameters[i].type)) {
            return false;
        }
    }

    return true;
}

/**
 * Unlike matchDataTypes, this function checks if two data types are identical, not equivalent.
 * @param ctx 
 * @param a 
 * @param b 
 * @returns 
 */
export function areDataTypesIdentical(ctx: Context, a: DataType, b: DataType): boolean {
    return matchDataTypesRecursive(ctx, a, b, true).success && matchDataTypesRecursive(ctx, b, a, true).success;
}



/**
 * Checks if two expressions are compatible based on their immutable/mutable status
 * @param e1 
 * @param e2 
 */
export function checkExpressionArgConst(e1: Expression, dt1: DataType, e2: FunctionArgument, dt2: DataType) {
    if (e1.isConstant && e2.isMutable && dt1.isAssignable() && (dt2.isAssignable())) {
        return false;
    }

    return true;
}

/**
 * Used by casting expressions to check if the source type can be cast to the target type.
 * This handles the specific case where basic types are allowed to be cast to each other.
 * @param ctx 
 * @param sourceType 
 * @param targetType 
 * @returns 
 */
export function canCastTypes(ctx: Context, sourceType: DataType, targetType: DataType): TypeMatchResult {
    // Example rule: Allow casting between numeric types
    if (sourceType.is(ctx, BasicType) && targetType.is(ctx, BasicType)) {
        return Ok();
    }

    // Fallback to stricter matching if no casting rules apply
    return matchDataTypes(ctx, sourceType, targetType, true);
}


/**
 * Reduces a list of struct fields by removing duplicate fields and keeping the first occurence of each field,
 * this is used to remove fields that are shadowed by later fields with the same name
 * @param fields 
 */
export function reduceStructFields(ctx: Context, t2Fields: StructField[], strict: boolean, stack: string[]): { fields: StructField[], err: TypeMatchResult } {
    // we will have to reduce the elements of struct t2, to remove duplicates
    let elementTypes: Map<string, DataType[]> = new Map();
    let names: string[] = [];
    for (let field of t2Fields) {
        let key = field.name;
        if (elementTypes.has(key)) {
            elementTypes.get(key)!.push(field.type);
        }
        else {
            elementTypes.set(key, [field.type]);
        }
        if (!names.includes(key)) {
            names.push(key);
        }
    }

    for (let [key, value] of elementTypes) {
        if (value.length > 1) {
            // make sure all types are compatible
            for (let type of value) {
                let res = matchDataTypesRecursive(ctx, type, value[0], true, stack);
                if (!res.success) {
                    return { fields: [], err: Err(`Duplicate field ${key} in struct types do not match pre-existing field type: ${res.message}`) };
                }
            }
        }
    }

    // create a new struct with the reduced fields
    let newFields: StructField[] = [];
    for (let [i, value] of elementTypes.entries()) {
        newFields.push(new StructField(t2Fields[0].location, i, value[0]));
    }

    return { fields: newFields, err: Ok() };
}


/**
 * Iterated over all inferred struct fields, and returns new fields
 * with largest type between the hint and inferred struct fields
 * for example hint: {a: int64} inferred: {a: int32, b: int32}
 *                -> {a: int64, b: int32} // adjust a to hint
 * @param ctx 
 * @param hintStruct 
 * @param inferredStruct 
 * @returns 
 */
export function getLargestStruct(ctx: Context, hintStruct: StructType, inferredStruct: StructType): StructType {
    //let hFields = hintStruct.fields;
    let iFields = inferredStruct.fields;

    let newFields: StructField[] = [];

    for (const f of iFields) {
        let hintType = hintStruct.getFieldTypeByName(f.name)

        if (hintType) {
            let iSize = getDataTypeByteSize(f.type);
            let hSize = getDataTypeByteSize(hintType);
            if (iSize > hSize) {
                newFields.push(new StructField(f.location, f.name, f.type));
            }
            else {
                newFields.push(new StructField(f.location, f.name, hintType));
            }
        }
        else {
            newFields.push(new StructField(f.location, f.name, f.type));
        }
    }

    return new StructType(hintStruct.location, newFields);
}

/**
 * Merge Struct, recursively merges two structs,
 * if both struct have nested structs, these nested structs are recursively merged.
 * Reocurring fields must match and must be identical
 * 
 */
export function mergeStructs(ctx: Context, s1: StructType, s2: StructType): {struct: StructType | null, err: TypeMatchResult} {
    let s1Fields = s1.fields;
    let s2Fields = s2.fields;

    let newFieldsMap = new Map<string, StructField>();
    for (let field of s1Fields) {
        newFieldsMap.set(field.name, new StructField(field.location, field.name, field.type));
    }

    for (let field of s2Fields) {
        let existingField = newFieldsMap.get(field.name);
        // Handle merge logic and update map
        if (existingField && field.type.is(ctx, StructType) && existingField.type.is(ctx, StructType)) {
            let mergedStruct = mergeStructs(ctx, field.type.to(ctx, StructType) as StructType, existingField.type.to(ctx, StructType) as StructType);
            if(!mergedStruct.err.success){
                return {struct: null, err: mergedStruct.err};
            }
            newFieldsMap.set(field.name, new StructField(field.location, field.name, mergedStruct.struct!));
        } else if (existingField) {
            // match types logic
            let res = matchDataTypes(ctx, field.type, existingField.type, true);
            if (!res.success) {
                return {struct: null, err: Err(`Struct field ${field.name} types do not match: ${res.message}`)};
            }
        } else {
            newFieldsMap.set(field.name, new StructField(field.location, field.name, field.type));
        }
    }

    return {struct: new StructType(s1.location, Array.from(newFieldsMap.values())), err: Ok()};
}


/**
 * Returns a substruct containing all fields listed in the arguments
 */
export function getSubStruct(struct: StructType, fields: string[]): StructType {
    let newFields: StructField[] = [];
    for (let field of struct.fields) {
        if (fields.includes(field.name)) {
            newFields.push(new StructField(field.location, field.name, field.type));
        }
    }
    return new StructType(struct.location, newFields);
}

/**
 * Checks if a type is a string class
 * by comparing it with the BuiltinStringType
 */
export function isStringClass(ctx: Context, type: DataType): boolean {
    // string is a class, so this is a quick check
    if(!type.is(ctx, ClassType)) {
        return false;
    }

    // check if the string class is loaded
    if(BuiltinModules.String === null) {
        throw new Error("String class not found");
    }

    // check if the type is the string class
    let res = matchDataTypes(ctx, type, BuiltinModules.String!, true);
    return res.success;
}