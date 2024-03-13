/**
 * Filename: ClassAttribute.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 * Models a class attribute
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { DataType } from "../types/DataType";
import { SymbolLocation } from "../symbol/SymbolLocation";


export class ClassAttribute {
    name: string;
    type: DataType;
    isStatic: boolean;
    location: SymbolLocation;

    constructor(location: SymbolLocation, name: string, type: DataType, isStatic: boolean){
        this.location = location;
        this.name = name;
        this.type = type;
        this.isStatic = isStatic;
    }

    serialize(): string {
        return `@attribute{${this.name}:${this.type.serialize()}}`
    }
}