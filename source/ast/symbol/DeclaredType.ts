/**
 * Filename: DeclaredType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a declared type
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { DataType } from "../types/DataType";
import { Context } from "./Context";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";

export class DeclaredType extends Symbol {
    name: string;
    type: DataType;
    genericParameters: DataType[];
    parentPackage: string;

    parentContext: Context;

    constructor(location: SymbolLocation, parentContext: Context, name: string, type: DataType, genericParameters: DataType[] = [], parentPackage: string){
        super(location, "type_declaration", name);
        this.name = name;
        this.type = type;
        this.parentContext = parentContext;
        this.parentPackage = parentPackage;
        this.genericParameters = genericParameters;
    }

    /**
     * @returns true if the type is generic, false otherwise
     */
    isGeneric(): boolean {
        return this.genericParameters.length > 0;
    }
}