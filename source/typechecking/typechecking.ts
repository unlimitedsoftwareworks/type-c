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
import { BasicType } from "../ast/types/BasicType";
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
import { ProcessType } from "../ast/types/ProcessType";
import { ReferenceType } from "../ast/types/ReferenceType";
import { StructType } from "../ast/types/StructType";
import { UnionType } from "../ast/types/UnionType";
import { UnsetType } from "../ast/types/UnsetType";
import { VariantConstructorType } from "../ast/types/VariantConstructorType";
import { VariantType } from "../ast/types/VariantType";
import { VoidType } from "../ast/types/VoidType";


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
    if(t1 === undefined) {
        console.log('t1 is null')
    }
    return `${t1.hash()}-${t2.hash()}-${strict}`;
}


const typeMatchCache = new WeakMap<Context, Map<string, TypeMatchResult>>();

let globalMatchingStack: string[] = [];

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
export function matchDataTypes(ctx: Context, et: DataType, dt: DataType, strict: boolean = false): TypeMatchResult {
    if(globalMatchingStack.includes(generateTypeKey(et, dt, strict))) {
        return Ok();
    }
    globalMatchingStack.push(generateTypeKey(et, dt, strict));
    let res = matchDataTypesRecursive(ctx, et, dt, et.isStrict() || strict, []);
    globalMatchingStack.pop();
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
    if(stack.includes(typeKey)) {
        return Ok();
    }

    let scopeCache = typeMatchCache.get(ctx);
    if (!scopeCache) {
        scopeCache = new Map<string, TypeMatchResult>();
        typeMatchCache.set(ctx, scopeCache);
    }

    if(scopeCache.has(typeKey)) {
        return scopeCache.get(typeKey)!;
    }

    stack.push(typeKey);


    t1.resolve(ctx);
    t2.resolve(ctx);

    /**
     * 3. We check if the types are the same
     */

    let res = Ok();

    // case 1: void types
    if(t1.is(ctx, VoidType)) {
        // make sure t2 is also a void type
        if(!(t2 instanceof VoidType)) {
            res = Err(`Type mismatch, expected void, got ${t2.shortname()}`);
            scopeCache.set(typeKey, res);
        }

        return res;
    }

    // case 2: basic data types (integers, floats and doubles)
    if(t1.is(ctx, BasicType)) {
        if(t2.is(ctx, LiteralIntType)) {
            res = matchBasicLiteralIntType(ctx, t1.to(ctx, BasicType) as BasicType, t2.to(ctx, LiteralIntType) as LiteralIntType, strict);
            scopeCache.set(typeKey, res);
            return res;
        }

        if(!t2.is(ctx, BasicType)) {
            res = Err(`Type mismatch, expected ${t1.shortname()}, got ${t2.shortname()}`);
            scopeCache.set(typeKey, res);
            return res;
        }
        
        if(t1.kind === t2.kind) {
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
    if(t1.is(ctx, BooleanType)) {
        if(!(t2.is(ctx, BooleanType))) {
            res = Err(`Type mismatch, expected boolean, got ${t2.shortname()}`);
        }

        scopeCache.set(typeKey, res);
        return res;
    }

    // case 3: array type

    if(t1.is(ctx, ArrayType)) {
        if(!(t2.is(ctx, ArrayType))) {
            res = Err(`Type mismatch, expected array, got ${t2.shortname()}`);
        }
        else {
            res = matchDataTypesRecursive(ctx, (t1.to(ctx, ArrayType) as ArrayType).arrayOf, (t2.to(ctx, ArrayType) as ArrayType).arrayOf, strict, stack);
        }
        scopeCache.set(typeKey, res);
        return res;
    }

    // case 4: null types, a null can be only assigned a null
    if(t1.is(ctx, NullType)) {
        if(!(t2.is(ctx, NullType))) {
            res = Err(`Type mismatch, expected null, got ${t2.shortname()}`);
        }
        scopeCache.set(typeKey, res);
        return res;
    }

    // case 5: nullable, nullable<T> can be assigned a value of type T or null
    if(t1.is(ctx, NullableType)) {
        if(t2.is(ctx, NullableType)) {
            res = matchDataTypesRecursive(ctx, (t1.to(ctx, NullableType) as NullableType).type, (t2.to(ctx, NullableType) as NullableType).type, strict, stack);
            scopeCache.set(typeKey, res);
            return res;
        }
        else if(t2.is(ctx, NullType)) {
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

    /**
     * case 6: Enum types
     * an enum type can be assigned a value of the same enum type or a literal integer type
     * if the type allows it. Also if strict is enabled, t2 must be an enum type, and not 
     * an integer.
     */
    if(t1.is(ctx, EnumType)) {
        if(t2.is(ctx, EnumType)) {
            res = matchEnumTypes(ctx, t1.to(ctx, EnumType) as EnumType, t2.to(ctx, EnumType) as EnumType, strict);
            scopeCache.set(typeKey, res);
            return res;
        }
        if((t2.is(ctx, LiteralIntType)) && (!strict)) {
            scopeCache.set(typeKey, res);
            return res;
        }

        let te = t1.to(ctx, EnumType) as EnumType;
        res = Err(`Type mismatch, expected enum with fields ${te.fields.map(e => e.name).join(", ")}, got ${t2.shortname()}`);
        scopeCache.set(typeKey, res);
        return res
    }

    /**
     * case 7: FFIMethodType
     * we should not be performing type matching on FFI methods
     * since they are only used to call method and should not be passed around
     */
    if(t1.is(ctx, FFIMethodType)) {
        res = Err("Cannot perform type matching on FFI methods");
        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 8: FunctionType
     * two functions are compatible if they have the same signature
     */
    if(t1.is(ctx, FunctionType)) {
        if(!t2.is(ctx, FunctionType)) {
            res = Err(`Type mismatch, expected function, got ${t2.shortname()}`);
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
    if(t1 instanceof GenericType) {
        throw new Error("Cannot perform type matching on generic types");
    }

    /**
     * case 10: LiteralIntType
     */
    if(t1.is(ctx, LiteralIntType)) {
        if(!t2.is(ctx, BasicType)) {
            res = Err(`Type mismatch, expected basic type, got ${t2.shortname()}`);
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
    if(t1.is(ctx, InterfaceType)) {
        if(t2.is(ctx, InterfaceType)) {
            res = matchInterfaces(ctx, t1.to(ctx, InterfaceType) as InterfaceType, t2.to(ctx, InterfaceType) as InterfaceType, strict, stack);
            scopeCache.set(typeKey, res);
            return res;
        }
        if(t2.is(ctx, ClassType)) {
            res = matchInterfaceClass(ctx, t1.to(ctx, InterfaceType) as InterfaceType, t2.to(ctx, ClassType) as ClassType, strict, stack);
            scopeCache.set(typeKey, res);
            return res;
        }
        res = Err(`Type mismatch, expected interface, got ${t2.shortname()}`);
        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 12: ClassType
     * a class is only compatible with another class with the exact same structure both attributes and methods
     */
    if(t1.is(ctx, ClassType)) {
        if(!t2.is(ctx, ClassType)) {
            res = Err(`Type mismatch, expected class, got ${t2.shortname()}`);
            scopeCache.set(typeKey, res);
            return res;
        }
        
        res = matchClasses(ctx, t1.to(ctx, ClassType) as ClassType, t2.to(ctx, ClassType) as ClassType, strict, stack);
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
     * case 15: ProcessType
     * Similar to classes, a process is only compatible with another process with the exact same structure
     */
    if(t1.is(ctx, ProcessType)) {
        if(!t2.is(ctx, ProcessType)) {
            res = Err(`Type mismatch, expected process, got ${t2.shortname()}`);
            scopeCache.set(typeKey, res);
            return res;
        }
        res = matchProcesses(ctx, t1.to(ctx, ProcessType) as ProcessType, t2.to(ctx, ProcessType) as ProcessType, strict, stack);
        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 16: UnionType, unions are only used to model generic type constraints, hence we should not be here
     */
    if(t1 instanceof UnionType) {
        throw new Error("Union types should not be here");
    }

    /**
     * case 17: VariantType, a variant type is only compatible with another variant type with the exact same structure, 
     * or a constructor of the variant type
     */
    if(t1.is(ctx, VariantType)) {
        if(t2.is(ctx, VariantType)) {
            res = matchVariants(ctx, t1.to(ctx, VariantType) as VariantType,  t2.to(ctx, VariantType) as VariantType, strict, stack);
        }
        else if(t2.is(ctx, VariantConstructorType)) {
            res = matchVariantWithConstructor(ctx, t1.to(ctx, VariantType) as VariantType, t2.to(ctx, VariantConstructorType) as VariantConstructorType, strict, stack);
        }
        else {
            res = Err(`Type mismatch, expected variant or variant constructor type of base tyep ${(t1.to(ctx, VariantType) as VariantType).shortname()}, got ${t2.shortname()}`);
        }
        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 18: VariantConstructorType, a variant constructor is only compatible with another variant constructor
     *  with the exact same structure
     */
    if(t1.is(ctx, VariantConstructorType)) {
        if(!t2.is(ctx, VariantConstructorType)) {
            res = Err(`Type mismatch, expected variant constructor, got ${t2.shortname()}`);
        }
        else {
            res = matchVariantConstructors(ctx, t1.to(ctx, VariantConstructorType) as VariantConstructorType, t2.to(ctx, VariantConstructorType) as VariantConstructorType, strict, stack);
        }

        scopeCache.set(typeKey, res);
        return res;
    }


    if(t1.is(ctx, StructType)) {
        if(!(t2.is(ctx, StructType))) {
            res = Err(`Type mismatch, expected struct, got ${t2.shortname()}`);
        }
        else {
            res = matchStructs(ctx, t1.to(ctx, StructType) as StructType, t2.to(ctx, StructType) as StructType, strict, stack);
        }

        scopeCache.set(typeKey, res);
        return res;
    }

    /**
     * case 19: UnsetType
     * an unset type is used for methods who's return type is not set, hence we should not be here
     */
    if(t1 instanceof UnsetType) {
        throw new Error("Unset types should not be here");
    }

    res = Err(`Type mismatch, ${t1.shortname()} and ${t2.shortname()} are not compatible`);
    scopeCache.set(typeKey, res);
    return res;
}

function matchBasicTypes(ctx: Context, t1: BasicType, t2: BasicType, strict: boolean): TypeMatchResult {
    if(strict) {
        if(t1.kind === t2.kind) {
            return Ok();
        } else {
            return Err(`Type mismatch, expected ${t1.shortname()}, got ${t2.shortname()}`);
        }
    }

    if(t1.kind === t2.kind) {
        return Ok();
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
            return Err(`Type mismatch, cannot safely cast ${t1.shortname()} to ${t2.shortname()}`);
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
            return Err(`Type mismatch, cannot safely cast ${t1.shortname()} to ${t2.shortname()}`);
        }
    }

    // Existing checks for unsigned and signed integer ranges within their own types
    if (unsignedInts.includes(t1.kind) && unsignedInts.includes(t2.kind)) {
        if (unsignedInts.indexOf(t1.kind) >= unsignedInts.indexOf(t2.kind)) {
            return Ok();
        } else {
            return Err(`Type mismatch, expected ${t1.shortname()}, got ${t2.shortname()}`);
        }
    }

    if (signedInts.includes(t1.kind) && signedInts.includes(t2.kind)) {
        if (signedInts.indexOf(t1.kind) >= signedInts.indexOf(t2.kind)) {
            return Ok();
        } else {
            return Err(`Type mismatch, expected ${t1.shortname()}, got ${t2.shortname()}`);
        }
    }

    // Checks for floats remain unchanged
    if (floats.includes(t1.kind) && floats.includes(t2.kind)) {
        if (floats.indexOf(t1.kind) >= floats.indexOf(t2.kind)) {
            return Ok();
        } else {
            return Err(`Type mismatch, expected ${t1.shortname()}, got ${t2.shortname()}`);
        }
    }

    // All other combinations are incompatible.
    return Err(`Type mismatch, unexpected combination of ${t1.shortname()} and ${t2.shortname()}`);
}


function matchEnumTypes(ctx: Context, t1: EnumType, t2: EnumType, strict: boolean): TypeMatchResult {
    // if strict is enabled, the types must be the same and not just compatible
    let t1Fields = t1.fields;
    let t2Fields = t2.fields;

    if(t1Fields.length !== t2Fields.length) {
        return Err(`Type mismatch, expected enum with fields ${t1Fields.map(e => e.name).join(", ")}, got ${t2Fields.map(e => e.name).join(", ")}`);
    }

    for(let i = 0; i < t1Fields.length; i++) {
        let f1 = t1Fields[i];
        let f2 = t2Fields[i];

        if(f1.name !== f2.name) {
            return Err(`Type mismatch, expected enum with fields ${t1Fields.map(e => e.name).join(", ")}, got ${t2Fields.map(e => e.name).join(", ")}`);
        }

        if(f1.value !== f2.value) {
            return Err(`Type mismatch, enum field ${f1.name} has different values (${f1.value} and ${f2.value})`);
        }
    }

    return Ok();
}

function matchBasicLiteralIntType(ctx: Context, t1: BasicType, t2: LiteralIntType, strict: boolean): TypeMatchResult {
    // TODO: use _byteSize information of literal type to make sure the literal type is compatible with the basic type
    return Ok();
}

function matchFunctionType(ctx: Context, t1: FunctionType, t2: FunctionType, stack: string[], strict: boolean): TypeMatchResult {
    if (t1.parameters.length != t2.parameters.length) {
        return Err(`Function parameter counts do not match, ${t1.parameters.length} and ${t2.parameters.length} are not compatible`)
    }

    for (let i = 0; i < t1.parameters.length; i++) {
        if (t1.parameters[i].isMutable != t2.parameters[i].isMutable) {
            return Err(`Function parameter ${i} mutability does not match, ${(t1.parameters[i].isMutable ? "mut " : "const ") +
                t1.parameters[i].name} and ${(t2.parameters[i].isMutable ? "mut " : "const ") + t2.parameters[i].name} are not compatible`)
        }
        let res = matchDataTypesRecursive(ctx, t2.parameters[i].type, t1.parameters[i].type, strict, stack)
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
        if(t1.returnType.is(ctx, UnsetType)){
            return Ok();
        }
        let res = matchDataTypesRecursive(ctx, t1.returnType, t2.returnType as DataType, strict, stack)
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

    if(strict) {
        if(t1Methods.length !== t2Methods.length) {
            return Err(`Type mismatch, expected interface with ${t1Methods.length} methods, got ${t2Methods.length}`);
        }
    }
    else {
        if(t1Methods.length > t2Methods.length) {
            return Err(`Type mismatch, expected interface with at most ${t1Methods.length} methods, got ${t2Methods.length}`);
        }
    }

    // every method of t1 must match exactly one in t2
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
            return Err(`Method ${method.name} not found in interface ${t2.shortname()}`);
        }
    }

    return Ok();
}

function matchInterfaceClass(ctx: Context, t1: InterfaceType, t2: ClassType, strict: boolean, stack: string[]): TypeMatchResult {
    let t1Methods = t1.methods;
    let t2Methods = t2.methods.map(e => e.imethod);

    if(strict) {
        if(t1Methods.length > t2Methods.length) {
            return Err(`Type mismatch, expected interface with at most ${t1Methods.length} methods, got ${t2Methods.length}`);
        }
    }

    // every method of t1 must match exactly one in t2
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
            return Err(`Method ${method.name} not found in class ${t2.shortname()}`);
        }
    }

    return Ok();
}

function matchClasses(ctx: Context, t1: ClassType, t2: ClassType, strict: boolean, stack: string[]): TypeMatchResult {
    /**
     * Some times, classes are not resolved due to circular dependencies, so we resolve them here
     */
    t1.resolve(ctx);
    t2.resolve(ctx);

    /**
     * strict is irrelevant here, since classes matching is strict by default
     */
    let t1Attributes = t1.attributes;
    let t2Attributes = t2.attributes;

    if(strict) {
        if(t1Attributes.length !== t2Attributes.length) {
            return Err(`Type mismatch, expected class with ${t1Attributes.length} attributes, got ${t2Attributes.length}`);
        }
    }
    else {
        if(t1Attributes.length > t2Attributes.length) {
            return Err(`Type mismatch, expected class with at most ${t1Attributes.length} attributes, got ${t2Attributes.length}`);
        }
    }

    // every attribute of t1 must match exactly one in t2
    for(let attribute of t1Attributes) {
        let found = false;
        for(let attribute2 of t2Attributes) {
            if(attribute.name === attribute2.name) {
                let res = matchDataTypesRecursive(ctx, attribute.type, attribute2.type, strict, stack);
                if(!res.success) {
                    return res;
                }
                found = true;
                break;
            }
        }
        if(!found) {
            return Err(`Attribute ${attribute.name} not found in class ${t2.shortname()}`);
        }
    }

    let t1Methods = t1.methods.map(e => e.imethod);
    let t2Methods = t2.methods.map(e => e.imethod);

    if(strict) {
        if(t1Methods.length !== t2Methods.length) {
            return Err(`Type mismatch, expected class with ${t1Methods.length} methods, got ${t2Methods.length}`);
        }
    }
    else {
        if(t1Methods.length > t2Methods.length) {
            return Err(`Type mismatch, expected class with at most ${t1Methods.length} methods, got ${t2Methods.length}`);
        }
    }

    // every method of t1 must match exactly one in t2
    for(let method of t1Methods) {
        // we find the method in t2
        let m = t2.getMethodBySignature(ctx, method.name, method.header.parameters.map(e => e.type), method.header.returnType);
        if(m.length === 0) {
            return Err(`Method ${method.shortname()} not found in class ${t2.shortname()}`);
        }
        else if (m.length > 1) {
            return Err(`Ambiguous method ${method.shortname()} in class ${t2.shortname()}`);
        }
        else {
            let res = matchFunctionType(ctx, method.header, m[0].header, stack, strict);
            if(!res.success) {
                return res;
            }
        }
    }

    return Ok();
}

function matchJoinType(ctx: Context, t1: JoinType, t2: DataType, strict: boolean, stack: string[]): TypeMatchResult {
    throw new Error("Not implemented");
}

function matchProcesses(ctx: Context, t1: ProcessType, t2: ProcessType, strict: boolean, stack: string[]): TypeMatchResult {
    throw new Error("Not implemented");
}

// matches two variants
function matchVariants(ctx: Context, t1: VariantType, t2: VariantType, strict: boolean, stack: string[]): TypeMatchResult {
    let t1Constructors = t1.constructors;
    let t2Constructors = t2.constructors;

    if(strict) {
        if(t1Constructors.length !== t2Constructors.length) {
            return Err(`Type mismatch, expected variant with ${t1Constructors.length} constructors, got ${t2Constructors.length}`);
        }
    }
    else {
        if(t1Constructors.length > t2Constructors.length) {
            return Err(`Type mismatch, expected variant with at most ${t1Constructors.length} constructors, got ${t2Constructors.length}`);
        }
    }

    // every constructor of t1 must match exactly one in t2
    for(let constructor of t1Constructors) {
        let found = false;
        for(let constructor2 of t2Constructors) {
            if(constructor.name === constructor2.name) {
                let res = matchVariantConstructors(ctx, constructor, constructor2, strict, stack);
                if(!res.success) {
                    return res;
                }
                found = true;
                break;
            }
        }
        if(!found) {
            return Err(`Constructor ${constructor.name} not found in variant ${t2.shortname()}`);
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
    for(let constructor of t1Constructors) {
        let res = matchVariantConstructors(ctx, constructor, t2, strict, stack);
        if(res.success) {
            return res;
        }
    }

    return Err(`Constructor ${t2.name} not found in variant ${t1.shortname()}`);
}

// matches two variant constructors
function matchVariantConstructors(ctx: Context, t1: VariantConstructorType, t2: VariantConstructorType, strict: boolean, stack: string[]): TypeMatchResult {
    /**
     * A variant constructor matches another variant constructor if:
     * 1. they have the same name
     * 2. they have the same number of parameters
     * 3. the types of the parameters match
     */

    if(t1.name !== t2.name) {
        return Err(`Constructor names do not match, expected ${t1.name}, got ${t2.name}`);
    }

    if(t1.parameters.length !== t2.parameters.length) {
        return Err(`Constructor parameter counts do not match, ${t1.parameters.length} and ${t2.parameters.length} are not compatible`);
    }

    for(let i = 0; i < t1.parameters.length; i++) {
        let p1 = t1.parameters[i];
        let p2 = t2.parameters[i];
        let res = matchDataTypesRecursive(ctx, p1.type, p2.type, strict, stack);
        if(!res.success) {
            return Err(`Constructor parameter ${i} types do not match: ${res.message}`);
        }
    }

    return Ok();
}

function matchStructs(ctx: Context, t1: StructType, t2: StructType, strict: boolean, stack: string[]): TypeMatchResult {
    let t1Fields = t1.fields;
    let t2Fields = t2.fields;

    if(strict) {
        if(t1Fields.length !== t2Fields.length) {
            return Err(`Type mismatch, expected struct with ${t1Fields.length} fields, got ${t2Fields.length}`);
        }
    }
    else {
        if(t1Fields.length > t2Fields.length) {
            return Err(`Type mismatch, expected struct with at most ${t1Fields.length} fields, got ${t2Fields.length}`);
        }
    }

    // every field of t1 must match exactly one in t2
    for(let field of t1Fields) {
        let found = false;
        for(let field2 of t2Fields) {
            if(field.name === field2.name) {
                let res = matchDataTypesRecursive(ctx, field.type, field2.type, strict, stack);
                if(!res.success) {
                    return Err(`Field ${field.name} types do not match: ${res.message}: ${res.message}`);
                }
                found = true;
                break;
            }
        }
        if(!found) {
            return Err(`Field ${field.name} not found in struct ${t2.shortname()}`);
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
export function areSignaturesIdentical(ctx: Context, a: FunctionType, b: FunctionType): boolean {
    // first, check if the number of parameters is the same
    if(a.parameters.length !== b.parameters.length) return false;
    
    // return type do not matter when overloading methods, so we check parameter types

    for(let i = 0; i < a.parameters.length; i++){
        if(!areDataTypesIdentical(ctx, a.parameters[i].type, b.parameters[i].type)){
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
    return matchDataTypesRecursive(ctx, a, b, true).success;
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
    if(sourceType.is(ctx, BasicType) && targetType.is(ctx, BasicType)) {
        return Ok();
    }

    // Additional rules here...

    // Fallback to stricter matching if no casting rules apply
    return matchDataTypes(ctx, sourceType, targetType, true);
}