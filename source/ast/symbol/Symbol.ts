/**
 * Filename: Symbol.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models an abstract Symbol in the symbol table
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Annotation } from "../../annotations/Annotation";
import { Context } from "./Context";
import {SymbolLocation} from "./SymbolLocation";

export type SymbolKind =
    "variable_declaration" |
    "variable_pattern" |
    "type_declaration" |
    "function_argument" |
    "closure_argument" |
    "class_attribute" |
    "implementation_attribute" |
    "class_method" |
    "implementation_method" |
    "function" |
    "overloaded_function" |
    "lambda" |
    "ffi" |
    "namespace";


export class Symbol {
    location: SymbolLocation;
    kind: SymbolKind;
    name: string;
    parentContext: Context | null = null;
    external: boolean = false;
    isLocal: boolean = false; // local to global scope or namespace

    annotations: Annotation[] = [];

    // the parent context will set the UID of the symbol
    uid: string = "";

    constructor(location: SymbolLocation, kind: SymbolKind, name: string){
        this.location = location;
        this.kind = kind;
        this.name = name;
    }

    setLocal(local: boolean){
        this.isLocal = local;
    }
}
