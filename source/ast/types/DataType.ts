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

export type DataTypeKind =
    "interface" | // InterfaceType
    "struct" | // StructType
    "class" | // ClassType
    "array" | // ArrayType
    "enum" | // EnumType
    "variant" | // VariantType
    "variant_constructor" | // VariantConstructorType
    "process" | // ProcessType
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
    "meta_enum" // MetaStructType, used for meta structs


export class DataType {
    kind: DataTypeKind;
    location: SymbolLocation;
    
    // if this is true, the type is strict, meaning it is only compatible with types of exact same structure.
    private _isStrict: boolean = false;
    private _hash: string | null = null;

    constructor(location: SymbolLocation, kind: DataTypeKind){
        this.kind = kind;
        this.location = location;
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
    serialize(): string {
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
     * Checks if a DataType is of a certain type
     * While this method uses instanceof, it not used to check the actual instance, but rather the semantic,
     * for example: let t: DataType = new JoinType(...), t.is(InterfaceType) will return true, to get the 
     * interface type, use t.toInterfaceType().
     * This method is overloaded in JoinType to return true for InterfaceType and JoinType
     * @param targetType 
     * @returns 
     */
    is(targetType: new (...args: any[]) => DataType): boolean {
        // we use the kind attribute to avoid circular dependencies
        if (this.kind === "reference") {
            return this.dereference().is(targetType);
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
    to(targetType: new (...args: any[]) => DataType): DataType {
        if (this.kind === "reference") {
            return this.dereference().to(targetType);
        }
        else {
            if(!(this instanceof targetType)){
                throw new Error(`Unreachable`);
            }
            return this;
        }
    }
}