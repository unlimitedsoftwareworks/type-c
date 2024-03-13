/**
 * Filename: StructVariablePatternExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a variable pattern expression that holds the remaining elements of a struct {name: x, ...z}
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { VariablePattern } from "../symbol/VariablePattern";
import { PatternExpression } from "./PatternExpression";

export class StructVariablePatternExpression extends PatternExpression {
    name: string;
    
    /**
     * Pointer to the symbol table entry for this variable
     */
    symbolPointer: VariablePattern | null = null;

    constructor(location: SymbolLocation, name: string) {
        super(location, "variable");
        this.name = name;
    }
}