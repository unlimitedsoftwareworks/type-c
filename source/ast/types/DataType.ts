/**
 * Filename: DataType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an abstract data type
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { xxHash32 } from 'js-xxhash';
import { GenericType } from "./GenericType";

export type DataTypeKind =
    "interface" | // InterfaceType
    "struct" | // StructType
    "class" | // ClassType
    "array" | // ArrayType
    "enum" | // EnumType
    "variant" | // VariantType
    "variant_constructor" | // VariantConstructorType
    "promise" | // PromiseType
    "lock" | // LockType
    "fn" | // FunctionType
    "reference" |
    "generic" | // GenericType
    "join" | // JoinType
    "union" | // UnionType
    "u8" |
    "u16" |
    "u32" |
    "u64" |
    "i8" |
    "i16" |
    "i32" |
    "i64" |
    "f32" |
    "f64" |
    "literal_number" | // LiteralNumberType
    "bool" | // BoolType
    "null" |  // NullType
    "void" | // VoidType
    "nullable" | // NullableType
    "ffi_method" | // FFI Method
    "ffi_namespace_type" |
    "unset" | // UnsetType
    "literal" | // LiteralType
    "meta_class" | // MetaClassType, used for meta classes, 
    "meta_interface" | // MetaInterfaceType, used for meta interfaces
    "meta_variant" | // MetaVariantType, used for constructing variants
    "meta_variant_constructor" | // MetaVariantConstructorType, used for constructing variant constructors
    "meta_enum" | // MetaStructType, used for meta structs 
    "tuple" | // TupleType
    "coroutine"| // CoroutineType, representing a coroutine instance
    "cofn"; // CoFunctionType, representing a coroutine function


export class DataType {
    kind: DataTypeKind;
    location: SymbolLocation;
    
    // if this is true, the type is strict, meaning it is only compatible with types of exact same structure.
    private _isStrict: boolean = false;
    private _hash: string | null = null;
    
    protected _declContext: Context | null = null;

    constructor(location: SymbolLocation, kind: DataTypeKind){
        this.kind = kind;
        this.location = location;
    }

    setDeclContext(ctx: Context){
        this._declContext = ctx;
    }

    /**
     * Perform type checking on the type, making sure it is valid
     * Resolving a type is a recursive process, and may involve resolving other types
     * 
     * @param ctx 
     * @param hint 
     */
    resolve(ctx: Context): void {
        throw new Error("Method not implemented.");
    }

    /**
     * Returns the non-reference type of this type
     * i.e. if this type is a reference type, it returns the type it references
     */
    dereference(): DataType {
        return this;
    }

    /**
     * Returns the non-nullable type of this type
     * i.e. if this type is a nullable type, it returns the type it references
     */
    denull(): DataType {
        return this;
    }

    /**
     * Returns the non-nullable, non-reference type of this type
     * @returns 
     */
    denullReference(): DataType {
        return this;
    }

    /**
     * Returns the short name of the type
     */
    shortname(): string {
        throw new Error("Method not implemented.");
    }

    /**
     * Serializes the type to a string
     */
    serialize(unpack: boolean = false): string {
        throw new Error("Method not implemented.");
    }

    hash(): string {
        if(this._hash === null){
            this._hash = xxHash32(this.serialize()).toString(16);
        }
        return this._hash;
    }

    isStrict(): boolean {
        return this._isStrict;
    }

    /**
     * Returns true if the type is assignable to the other type, false otherwise
     * for example, constant types are not assignable to non-constant types
     */
    isAssignable(): boolean {
        return true;
    }

    clone(typeMap: {[key: string]: DataType}): DataType {
        throw new Error("Method not implemented.");
    }

    /**
     * used by reference types to resolve the type they reference
     * @param ctx 
     */
    resolveIfNeeded(ctx: Context){
    }

    getBaseType(ctx: Context): DataType {
        return this;
    }

    /**
     * Checks if a DataType is of a certain type
     * While this method uses instanceof, it not used to check the actual instance, but rather the semantic,
     * for example: let t: DataType = new JoinType(...), t.is(InterfaceType) will return true, to get the 
     * interface type, use t.toInterfaceType().
     * This method is overloaded in JoinType to return true for InterfaceType and JoinType
     * @param targetType 
     * @returns 
     */
    is(ctx: Context, targetType: new (...args: any[]) => DataType): boolean {
        this.resolveIfNeeded(ctx);
        // we use the kind attribute to avoid circular dependencies
        if (this.kind === "reference") {
            let dt = this.getBaseType(ctx);
            dt.resolve(ctx)
            return dt.is(ctx, targetType);
        }
        else if(this.kind === "nullable") {
            if (this instanceof targetType) {
                return true
            }
            else {
                // @ts-ignore
                return this.denull().is(ctx, targetType);
            }
        }
        else {
            return this instanceof targetType;
        }
    }

    /**
     * Same logic as is, but performs the casting, by resolving the reference type and returning 
     * the appropriate type.
     * 
     * Casting is need after call, since it returns a generic type, but is guarentees that the returned type is of the given
     * instance
     */
    to(ctx: Context, targetType: new (...args: any[]) => DataType): DataType {
        if (this.kind === "reference") {
            // @ts-ignore
            this.resolveIfNeeded(ctx);
            return this.dereference().to(ctx, targetType);
        }
        else {
            if(!(this instanceof targetType)){
                throw new Error(`Unreachable`);
            }
            return this;
        }
    }

    /**
     * Returns true if the datatype can be wrapped by a nullable such as X?
     * Otherwise false.
     */
    allowedNullable(ctx: Context): boolean {
        // default behavior is to return false
        return false;
    }


    /**
     * Given a type that potentially has generic parameters, returns the mapping of which generic
     * parameters are used in the type, and the type they are used with
     * for example: 
     * 
     * 
     * getGenericParameters(ctx, struct {x: u32, y: T}, stricy{x: u32, y: i64}) would fill typeMap with {x: [i64]}
     * 
     * This variant is used to recursively fill the typeMap
     * 
     * @param ctx 
     * @param originalType 
     * @param typeMap 
     * @returns 
     */
    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        throw new Error("Method not implemented.");
    }

    /**
     * Given a type that potentially has generic parameters, returns the mapping of which generic
     * parameters are used in the type, and the type they are used with
     * for example: 
     * 
     * 
     * getGenericParameters(ctx, struct {x: u32, y: T}, stricy{x: u32, y: i64}) would fill typeMap with {x: [i64]}
     * 
     * @param ctx 
     * @param originalType 
     * @param genericNames List of generic names to fill, in case we find a reference type matching the generic name
     * 
     * @returns 
     */
    getGenericParameters(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}):  {[key: string]: DataType} {
        let typeMap: {[key: string]: DataType} = {}
        this.getGenericParametersRecursive(ctx, originalType, declaredGenerics, typeMap);
        return typeMap;
    }
}