/**
 * Filename: IfElseExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an if-else expression
 *      if x == 1 => y else z
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { Expression } from "./Expression";

export class IfElseExpression extends Expression {
    conditions: Expression[];
    bodies: Expression[];
    elseBody: Expression;

    constructor(location: SymbolLocation, conditions: Expression[], bodies: Expression[], elseBody: Expression) {
        super(location, "if_else");
        this.conditions = conditions;
        this.bodies = bodies;
        this.elseBody = elseBody;
    }
}