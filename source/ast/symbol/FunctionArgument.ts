/**
 * Filename: FunctionArgument.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a function argument
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import {Symbol} from "./Symbol";
import {DataType} from "../types/DataType";
import {SymbolLocation} from "./SymbolLocation";

export class FunctionArgument extends Symbol {
    name: string;
    type: DataType;
    isMutable: boolean;

    constructor(location: SymbolLocation, name: string, type: DataType, isMutable: boolean = false){
        super(location, "function_argument", name);
        this.name = name;
        this.type = type;
        this.isMutable = isMutable;
    }

    serialize(unpack: boolean = false): string {
        return `@argument{${this.name}:${this.type.serialize(unpack)},isMut:${this.isMutable}}`
    }

    clone(typeMap: {[key: string]: DataType}): FunctionArgument {
        return new FunctionArgument(this.location, this.name, this.type.clone(typeMap), this.isMutable);
    }

    getDescription(): string {
        return this.name + ": " + this.type.getShortName();
    }
}
