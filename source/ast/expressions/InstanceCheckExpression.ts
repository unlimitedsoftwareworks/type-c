/**
 * Filename: InstanceCheckExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an instance check expression
 *      x is Y
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Expression } from "./Expression";


export class InstanceCheckExpression extends Expression {
    expression: Expression;
    type: DataType;

    constructor (location: SymbolLocation, expression: Expression, type: DataType) {
        super(location, "instance_check");
        this.expression = expression;
        this.type = type;
    }
}