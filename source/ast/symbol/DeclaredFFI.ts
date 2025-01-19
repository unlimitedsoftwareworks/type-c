/**
 * Filename: DeclaredFFI.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a declared foreign function interface
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { FFIMethodType } from "../types/FFIMethodType";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";

export class DeclaredFFI extends Symbol {
    name: string;
    sharedObjectName: string;
    methods: FFIMethodType[];

    ffiId: number = DeclaredFFI.ffiIdCounter++;

    static ffiIdCounter: number = 0;

    static reset() {
        DeclaredFFI.ffiIdCounter = 0;
    }

    constructor(location: SymbolLocation, name: string, sharedObjectName: string, methods: FFIMethodType[]) {
        super(location, "ffi", name);
        this.name = name;
        this.sharedObjectName = sharedObjectName;
        this.methods = methods;

        this.methods.forEach((method) => {
            method.parentFFI = this;
        });
    }

    getMethodIndex(methodName: string): number {
        return this.methods.findIndex((method) => method.imethod.name === methodName);
    }

    getDetails(): string {
        return `FFI ${this.name}`;
    }

    getDescription(): string {
        return this.methods.map(m => m.getShortName()).join("\n");
    }
}
