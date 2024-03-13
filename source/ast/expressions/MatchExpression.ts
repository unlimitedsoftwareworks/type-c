/**
 * Filename: MatchExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models pattern matching expression
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { PatternExpression } from "../matching/PatternExpression";
import { BlockStatement } from "../statements/BlockStatement";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { Expression } from "./Expression";

export type MatchCaseType = "match_block" | "match_expression"

/**
 * Models a single match case
 */
export class MatchCaseExpression {
    type: MatchCaseType;
    expression: Expression | null = null;
    block: BlockStatement | null = null;
    guard: Expression | null = null;
    context: Context;
    location: SymbolLocation;
    pattern: PatternExpression;

    constructor(location: SymbolLocation, context: Context, pattern: PatternExpression, type: MatchCaseType, expression: Expression | null, block: BlockStatement | null, guard: Expression | null) {
        this.type = type;
        this.expression = expression;
        this.block = block;
        this.guard = guard;
        this.context = context;
        this.location = location;
        this.pattern = pattern;
    }
}

export class MatchExpression extends Expression {
    expression: Expression;
    cases: MatchCaseExpression[];

    constructor(location: SymbolLocation, expression: Expression, cases: MatchCaseExpression[]) {
        super(location, "match");
        this.expression = expression;
        this.cases = cases;
    }
}