/**
 * Filename: typehcecking.ts
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
    return `${t1.hash()}-${t2.hash()}-${strict}`;
}


const typeMatchCache = new WeakMap<Context, Map<string, TypeMatchResult>>();

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
    let res = matchDataTypesRecursive(ctx, et, dt, et.isStrict() || strict, []);
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
export function matchDataTypesRecursive(ctx: Context, et: DataType, dt: DataType, strict: boolean = false, stack: string[] = []): TypeMatchResult {
    // resolve types
    et.resolve(ctx);
    dt.resolve(ctx);

    /**
     * 1. we remove any reference from the types
     */
    let t1 = et.dereference();
    let t2 = dt.dereference();

    if(t1 === null || t2 === null) {
        return Err("Cannot dereference type");
    }

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

    /**
     * 3. We check if the types are the same
     */

    // case 1: void types
    if(t1 instanceof VoidType) {
        // make sure t2 is also a void type
        if(!(t2 instanceof VoidType)) {
            return Err(`Type mismatch, expected void, got ${t2.shortname()}`);
        }
    }

    // case 2: basic data types (integers, floats and doubles)
    if(t1 instanceof BasicType) {
        if(t2 instanceof LiteralIntType) {
            return matchBasicLiteralIntType(ctx, t1, t2, strict);
        }

        if(!(t2 instanceof BasicType)) {
            return Err(`Type mismatch, expected ${t1.shortname()}, got ${t2.shortname()}`);
        }
        
        if(t1.kind === t2.kind) {
            return Ok();
        }
        else {
            return matchBasicTypes(ctx, t1, t2, strict);
        }
    }

    // case 2: boolean
    if(t1 instanceof BooleanType) {
        if(!(t2 instanceof BooleanType)) {
            return Err(`Type mismatch, expected boolean, got ${t2.shortname()}`);
        }

        return Ok();
    }

    // case 3: array type

    if(t1 instanceof ArrayType) {
        if(!(t2 instanceof ArrayType)) {
            return Err(`Type mismatch, expected array, got ${t2.shortname()}`);
        }

        let res = matchDataTypesRecursive(ctx, t1.arrayOf, t2.arrayOf, strict, stack);
        if(!res.success) {
            return res;
        }
        return Ok();
    }

    // case 4: null types, a null can be only assigned a null
    if(t1 instanceof NullType) {
        if(!(t2 instanceof NullType)) {
            return Err(`Type mismatch, expected null, got ${t2.shortname()}`);
        }
    }

    // case 5: nullable, nullable<T> can be assigned a value of type T or null
    if(t1 instanceof NullableType) {
        if(t2 instanceof NullableType) {
            return matchDataTypesRecursive(ctx, t1.type, t2.type, strict, stack);
        }
        if(t2 instanceof NullType) {
            return Ok();
        }
        return Err(`Type mismatch, expected nullable, got ${t2.shortname()}`);
    }

    /**
     * case 6: Enum types
     * an enum type can be assigned a value of the same enum type or a literal integer type
     * if the type allows it. Also if strict is enabled, t2 must be an enum type, and not 
     * an integer.
     */
    if(t1 instanceof EnumType) {
        if(t2 instanceof EnumType) {
            return matchEnumTypes(ctx, t1, t2, strict);
        }
        if((t2 instanceof LiteralIntType) && (!strict)) {
            return Ok();
        }
        return Err(`Type mismatch, expected enum with fields ${t1.fields.map(e => e.name).join(", ")}, got ${t2.shortname()}`);
    }

    /**
     * case 7: FFIMethodType
     * we should not be performing type matching on FFI methods
     * since they are only used to call method and should not be passed around
     */
    if(t1 instanceof FFIMethodType) {
        throw new Error("Cannot perform type matching on FFI methods");
    }

    /**
     * case 8: FunctionType
     * two functions are compatible if they have the same signature
     */
    if(t1 instanceof FunctionType) {
        if(!(t2 instanceof FunctionType)) {
            return Err(`Type mismatch, expected function, got ${t2.shortname()}`);
        }
        return matchFunctionType(ctx, t1, t2, stack, strict);
    }

    /**
     * case 9: GenericType
     */
    if(t1 instanceof GenericType) {
        throw new Error("Cannot perform type matching on generic types");
    }

    /**
     * case 10: LiteralIntType
     */
    if(t1 instanceof LiteralIntType) {
        if(!(t2 instanceof BasicType)) {
            return Err(`Type mismatch, expected basic type, got ${t2.shortname()}`);
        }
        // TODO: maybe swapping ain't enough
        return matchBasicLiteralIntType(ctx, t2, t1, strict);
    }

    /**
     * case 11: InterfaceType,
     * an interface is only compatible with another interface, or a class that implements its methods
     */
    if(t1 instanceof InterfaceType) {
        if(t2 instanceof InterfaceType) {
            return matchInterfaces(ctx, t1, t2, strict, stack);
        }
        if(t2 instanceof ClassType) {
            return matchInterfaceClass(ctx, t1, t2, strict, stack);
        }
        return Err(`Type mismatch, expected interface or class, got ${t2.shortname()}`);
    }

    /**
     * case 12: ClassType
     * a class is only compatible with another class with the exact same structure both attributes and methods
     */
    if(t1 instanceof ClassType) {
        if(!(t2 instanceof ClassType)) {
            return Err(`Type mismatch, expected class, got ${t2.shortname()}`);
        }
        
        return matchClasses(ctx, t1, t2, strict, stack);
    }
        
    /**
     * case 13: JoinType
     */
    if(t1 instanceof JoinType) {
        // a join type is the same as an interface
        return matchJoinType(ctx, t1, t2, strict, stack);
    }

    /**
     * case 14: ReferenceType, this is a reference to another type, but since we dereference, we should not be here
     */
    if(t1 instanceof ReferenceType) {
        throw new Error("Reference types should not be here");
    }

    /**
     * case 15: ProcessType
     * Similar to classes, a process is only compatible with another process with the exact same structure
     */
    if(t1 instanceof ProcessType) {
        if(!(t2 instanceof ProcessType)) {
            return Err(`Type mismatch, expected process, got ${t2.shortname()}`);
        }
        return matchProcesses(ctx, t1, t2, strict, stack);
    }

    /**
     * case 16: UnionType, unions are only used to model generic type constraints, hence we should not be here
     */
    if(t1 instanceof ReferenceType) {
        throw new Error("Union types should not be here");
    }

    /**
     * case 17: VariantType, a variant type is only compatible with another variant type with the exact same structure, 
     * or a constructor of the variant type
     */
    if(t1 instanceof VariantType) {
        if(t2 instanceof VariantType) {
            return matchVariants(ctx, t1, t2, strict, stack);
        }
        if(t2 instanceof VariantConstructorType) {
            return matchVariantWithConstructor(ctx, t1, t2, strict, stack);
        }
    }

    /**
     * case 18: VariantConstructorType, a variant constructor is only compatible with another variant constructor
     *  with the exact same structure
     */
    if(t1 instanceof VariantConstructorType) {
        if(!(t2 instanceof VariantConstructorType)) {
            return Err(`Type mismatch, expected variant constructor, got ${t2.shortname()}`);
        }
        return matchVariantConstructors(ctx, t1, t2, strict, stack);
    }


    if(t1 instanceof StructType) {
        if(!(t2 instanceof StructType)) {
            return Err(`Type mismatch, expected struct, got ${t2.shortname()}`);
        }
        return matchStructs(ctx, t1, t2, strict, stack);
    }

    /**
     * case 19: UnsetType
     * an unset type is used for methods who's return type is not set, hence we should not be here
     */
    if(t1 instanceof ReferenceType) {
        throw new Error("Unset types should not be here");
    }

    return Err(`Type mismatch, ${t1.shortname()} and ${t2.shortname()} are not compatible`);
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
