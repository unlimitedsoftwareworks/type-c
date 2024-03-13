/**
 * Filename: MatchStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models pattern matching statement
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Expression } from "../expressions/Expression";
import { MatchCaseExpression } from "../expressions/MatchExpression";
import { BlockStatement } from "../statements/BlockStatement";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { Statement } from "./Statement";

export type MatchCaseType = "match_block" | "match_expression"

export class MatchStatement extends Statement {
    expression: Expression;
    cases: MatchCaseExpression[];

    constructor(location: SymbolLocation, expression: Expression, cases: MatchCaseExpression[]) {
        super(location, "match");
        this.expression = expression;
        this.cases = cases;
    }

    infer(ctx: Context){
        throw ctx.parser.customError("Match statements are not supported yet", this.location)
    }
}