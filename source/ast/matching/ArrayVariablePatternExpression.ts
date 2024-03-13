/**
 * Filename: ArrayVariablePatternExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a variable pattern expression that holds the remaining elements of an array [...z]
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { LiteralExpression } from "../expressions/LiteralExpression";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { VariablePattern } from "../symbol/VariablePattern";
import { PatternExpression } from "./PatternExpression";

export class ArrayVariablePatternExpression extends PatternExpression {
    name: string;
    
    // position, if within an array
    position: number = -1;

    /**
     * Pointer to the symbol table entry for this variable
     */
    symbolPointer: VariablePattern | null = null;

    constructor(location: SymbolLocation, name: string) {
        super(location, "variable");
        this.name = name;
    }
}