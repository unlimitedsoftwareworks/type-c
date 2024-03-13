/**
 * Filename: StructPatternExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a struct pattern expression { x: a, y: 2, ...z }
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { LiteralExpression } from "../expressions/LiteralExpression";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { PatternExpression } from "./PatternExpression";

export type StructFieldPattern = {
    name: string,
    pattern: PatternExpression
}

export class StructPatternExpression extends PatternExpression {
    fieldPatterns: StructFieldPattern[];

    constructor(location: SymbolLocation, fieldPatterns: StructFieldPattern[]) {
        super(location, "struct");
        this.fieldPatterns = fieldPatterns;
    }
}