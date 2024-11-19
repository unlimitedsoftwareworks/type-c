/**
 * Filename: FFINamespaceType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models an FFI namespace type
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { DeclaredFFI } from "../symbol/DeclaredFFI";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType";
import { GenericType } from "./GenericType";

export class FFINamespaceType extends DataType {
    parentFFI: DeclaredFFI;

    constructor(location: SymbolLocation, parentFFI: DeclaredFFI) {
        super(location, "ffi_namespace_type");
        this.parentFFI = parentFFI;
    }

    resolve(ctx: Context) {
        // nothing to do
    }

    serialize(unpack: boolean = false): string {
        return `@ffi_namespace_type{id:${this.parentFFI.ffiId}}`
    }


    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // nothing to do
    }
}
