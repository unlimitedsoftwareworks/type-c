/**
 * Filename: LiteralPatternExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a literal pattern expression 1, "hello", true, etc
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/typechecking";
import { LiteralExpression } from "../expressions/LiteralExpression";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { PatternExpression } from "./PatternExpression";

export class LiteralPatternExpression extends PatternExpression {
    literal: LiteralExpression;

    constructor(location: SymbolLocation, literal: LiteralExpression) {
        super(location, "literal");
        this.literal = literal;
    }

    infer(ctx: Context, expressionType: DataType) {
        let r = matchDataTypes(ctx, this.literal.infer(ctx, expressionType), expressionType);
        if(!r.success) {
            throw ctx.parser.customError(`Cannot match ${expressionType.shortname()} again literal: ${r.success}`, this.location);
        }
    }
}