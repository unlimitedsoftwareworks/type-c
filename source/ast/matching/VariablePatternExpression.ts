/**
 * Filename: VariablePatternExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a variable pattern expression x, y, z, etc
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { VariablePattern } from "../symbol/VariablePattern";
import { ArrayType } from "../types/ArrayType";
import { DataType } from "../types/DataType";
import { PatternExpression } from "./PatternExpression";

export class VariablePatternExpression extends PatternExpression {
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


    infer(ctx: Context, expressionType: DataType, isConst: boolean | 0) {
        if(!this.symbolPointer) {
            this.symbolPointer = new VariablePattern(this.location, this.name, expressionType, isConst);
            ctx.addSymbol(this.symbolPointer);
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): VariablePatternExpression{
        let newVar = new VariablePatternExpression(this.location, this.name);
        newVar.position = this.position;
        return newVar;
    }
}