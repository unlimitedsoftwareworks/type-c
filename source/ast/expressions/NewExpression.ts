/**
 * Filename: NewExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a new Expression 
 *          new Array(10)
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Expression } from "./Expression";

export class NewExpression extends Expression {
    type: DataType;

    // the actual class type, since the base type can be a reference
    classType: DataType | null = null;

    // constructor arguments
    arguments: Expression[];

    constructor(location: SymbolLocation, type: DataType, arguments_: Expression[]) {
        super(location, "new");
        this.type = type;
        this.arguments = arguments_;
    }

}