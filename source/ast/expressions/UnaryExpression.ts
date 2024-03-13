/**
 * Filename: UnaryExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an Unary expression
 *          i++
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { OperatorOverloadState } from "../other/OperatorOverloadState";
import { Expression } from "./Expression";

export type UnaryOperator = "-" | "!" | "!!" | "~" | "pre++" | "post++" | "pre--" | "post--" | "await"

export class UnaryExpression extends Expression {
    expression: Expression;
    operator: UnaryOperator;

    // capture the state of the operator overload, if any
    // default is not overloaded
    operatorOverloadState: OperatorOverloadState = new OperatorOverloadState();

    constructor(location: SymbolLocation, expression: Expression, operator: UnaryOperator) {
        super(location, "unary_op");
        this.expression = expression;
        this.operator = operator;
    }
}