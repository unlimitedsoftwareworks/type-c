/**
 * Filename: VariablePattern.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a variable pattern expression x, y, z, etc
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { DataType } from "../types/DataType";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";

export class VariablePattern extends Symbol {
    name: string;
    type: DataType
    isConst: boolean | 0 = false;

    constructor(location: SymbolLocation, name: string, type: DataType, isConst: boolean | 0 = false) {
        super(location, "variable_pattern", name);
        this.name = name;
        this.type = type;
        this.isConst = isConst;
    }

    clone(typeMap: {[key: string]: DataType}): VariablePattern {
        return new VariablePattern(this.location, this.name, this.type.clone(typeMap));
    }

    getDescription(): string {
        return this.name + " : " + this.type.getShortName();
    }
}
