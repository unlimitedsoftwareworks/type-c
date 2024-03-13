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
    "ffi_type" |
    "unset" | // UnsetType
    "literal"; // LiteralType


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
}