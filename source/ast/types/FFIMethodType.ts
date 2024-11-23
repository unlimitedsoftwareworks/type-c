/**
 * Filename: FFIMethodType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a foreign function interface method type
 *     FFI methods has their own types because they cannot
 *     be used as anonymous functions
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { InterfaceMethod } from "../other/InterfaceMethod";
import { Context } from "../symbol/Context";
import { DeclaredFFI } from "../symbol/DeclaredFFI";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType";
import { GenericType } from "./GenericType";

export class FFIMethodType extends DataType {
    // reuse the interface method class
    parentFFI: DeclaredFFI | null = null;
    imethod: InterfaceMethod;

    constructor(location: SymbolLocation, imethod: InterfaceMethod) {
        super(location, "ffi_method");
        this.imethod = imethod;
    }

    resolve(ctx: Context){
        // make sure we have no generics
        if(this.imethod.generics.length > 0) {
            ctx.parser.customError("FFI Methods are not allowed to be generic", this.imethod.location);
            return
        }

        // resolve arguments
        this.imethod.header.parameters.forEach((param) => {
            param.type.resolve(ctx);
        });

        // resolve return type
        this.imethod.header.returnType.resolve(ctx);
    }

    shortname(): string {
        return "ffi_method";
    }

    serialize(unpack: boolean = false): string {
        return `@ffi_method{${this.imethod.serialize(unpack)}}`
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
     * Returns true if the type is assignable to the other type, false otherwise
     * for example, constant types are not assignable to non-constant types
     */
    isAssignable(): boolean {
        return false;
    }


    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // nothing to do
    }
}