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
import { GenericType } from "../types/GenericType";
import { Context } from "./Context";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";

export class DeclaredType extends Symbol {
    name: string;
    type: DataType;
    genericParameters: GenericType[];
    parentPackage: string;

    parentContext: Context;

    /** 
     * Concrete types, incase the type declaration is a generic one.
     * When a generic type is instantiated, it will be added here
     */
    concreteTypes: Map<string, DataType> = new Map();

    constructor(location: SymbolLocation, parentContext: Context, name: string, type: DataType, genericParameters: GenericType[] = [], parentPackage: string){
        super(location, "type_declaration", name);
        this.name = name;
        this.type = type;
        this.parentContext = parentContext;
        this.parentPackage = parentPackage;
        this.genericParameters = genericParameters;

        this.type.setDeclContext(parentContext);
    }

    /**
     * @returns true if the type is generic, false otherwise
     */
    isGeneric(): boolean {
        return this.genericParameters.length > 0;
    }

    clone(): DeclaredType {
        return new DeclaredType(this.location, this.parentContext, this.name, this.type, this.genericParameters, this.parentPackage);
    }
}