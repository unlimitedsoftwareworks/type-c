/**
 * Filename: FunctionPrototype.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a function prototype. A function proto is a named function with a header.
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Documentation } from "../../lexer/Documentation";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import {FunctionType} from "../types/FunctionType";
import {GenericType} from "../types/GenericType";

export class FunctionPrototype {
    header: FunctionType;
    generics: GenericType[]
    name: string;
    location: SymbolLocation;
    documentation: Documentation | null = null;

    constructor(location: SymbolLocation, name: string, header: FunctionType, generics: GenericType[] = []){
        this.location = location;
        this.name = name;
        this.header = header;
        this.generics = generics;
    }

    clone(typeMap: {[key: string]: DataType}): FunctionPrototype {
        return new FunctionPrototype(this.location, this.name, this.header.clone(typeMap), this.generics);
    }

    serialize(): string {
        return `@functionprototype{name:${this.name},header:${this.header.serialize()},generics:[${this.generics.map(g => g.serialize()).join(",")}]`
    }

    toString() {
        return this.serialize();
    }

    setDocumentation(doc: Documentation | null) {
        this.documentation = doc;
    }
}
