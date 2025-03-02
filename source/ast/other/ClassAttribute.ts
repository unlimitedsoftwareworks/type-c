/**
 * Filename: ClassAttribute.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a class attribute
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { DataType } from "../types/DataType";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { Symbol } from "../symbol/Symbol";
import { Documentation } from "../../lexer/Documentation";


export class ClassAttribute extends Symbol {
    name: string;
    type: DataType;
    isStatic: boolean;
    location: SymbolLocation;
    isConst: boolean;
    documentation: Documentation | null = null;

    static uidCounter: number = 0;

    static reset() {
        ClassAttribute.uidCounter = 0;
    }


    constructor(location: SymbolLocation, name: string, type: DataType, isStatic: boolean, isConst: boolean=false){
        super(location, "class_attribute", name);
        this.location = location;
        this.name = name;
        this.type = type;
        this.isStatic = isStatic;
        this.isConst = isConst;

        // set the unique identifier
        this.uid = `ca_${ClassAttribute.uidCounter++}`;
    }

    serialize(): string {
        return `@attribute{static:${this.isStatic},${this.name}:${this.type.serialize()}}`
    }

    clone(typeMap: { [key: string]: DataType; }): ClassAttribute {
        return new ClassAttribute(this.location, this.name, this.type.clone(typeMap), this.isStatic, this.isConst);
    }

    getDescription(): string {
        return this.name + ": " + this.type.getShortName();
    }

    setDocumentation(doc: Documentation | null) {
        this.documentation = doc;
    }
}
