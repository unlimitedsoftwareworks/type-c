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
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType";

export class FFIMethodType extends DataType {
    // reuse the interface method class
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

    serialize(): string {
        return `@ffi_method{${this.imethod.serialize()}}`
    }
}