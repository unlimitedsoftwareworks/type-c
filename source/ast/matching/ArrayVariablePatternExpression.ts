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
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { VariablePattern } from "../symbol/VariablePattern";
import { ArrayType } from "../types/ArrayType";
import { DataType } from "../types/DataType";
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

    infer(ctx: Context, expressionType: DataType) {
        if(!this.symbolPointer) {
            // used to cause an error when cloned, fixed by not adding variable pattern within Context.clone
            this.symbolPointer = new VariablePattern(this.location, this.name, new ArrayType(this.location, expressionType));
            ctx.addSymbol(this.symbolPointer);
        }
    }

    setPosition(pos: number){ 
        this.position = pos;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ArrayVariablePatternExpression{
        let newVar = new ArrayVariablePatternExpression(this.location, this.name);
        newVar.position = this.position;
        //newVar.symbolPointer = this.symbolPointer; will be set when inferred
        return newVar;
    }
}