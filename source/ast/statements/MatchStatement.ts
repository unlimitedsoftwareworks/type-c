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
import { DataType } from "../types/DataType";
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
        let type = this.expression.infer(ctx);
        this.cases.forEach(c => c.infer(ctx, type, this.expression.isConstant));
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): MatchStatement {
        let newExpression = this.expression.clone(typeMap, ctx);
        let newCases = this.cases.map(c => c.clone(typeMap, ctx));
        return new MatchStatement(this.location, newExpression, newCases);
    }
}