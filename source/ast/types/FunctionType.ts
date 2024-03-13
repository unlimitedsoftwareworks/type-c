/**
 * Filename: FunctionType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models function data type
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { FunctionArgument } from "../symbol/FunctionArgument";
import { Context } from "../symbol/Context";

export class FunctionType extends DataType {
    parameters: FunctionArgument[];
    returnType: DataType;

    constructor(location: SymbolLocation, parameters: FunctionArgument[], returnType: DataType) {
        super(location, "fn");
        this.parameters = parameters;
        this.returnType = returnType;
    }

    resolve(ctx: Context) {
        // resolve the types of the parameters 
        this.parameters.forEach((param) => {
            param.type.resolve(ctx);
        });

        // resolve the return type
        this.returnType.resolve(ctx);
    }

    shortname(): string {
        return "fn("+this.parameters.map((param) => param.type.shortname()).join(", ")+") -> "+this.returnType.shortname();
    }

    serialize(): string {
        return `@fn{@parameters[${this.parameters.map(e => e.serialize())}],@returnType[${this.returnType.serialize()}]}`
    }

    clone(typeMap: {[key: string]: DataType}): FunctionType {
        return new FunctionType(this.location, this.parameters.map(p => p.clone(typeMap)), this.returnType.clone(typeMap));
    }
}