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

import { LiteralExpression } from "../expressions/LiteralExpression";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { PatternExpression } from "./PatternExpression";

export class LiteralPatternExpression extends PatternExpression {
    literal: LiteralExpression;

    constructor(location: SymbolLocation, literal: LiteralExpression) {
        super(location, "literal");
        this.literal = literal;
    }
}