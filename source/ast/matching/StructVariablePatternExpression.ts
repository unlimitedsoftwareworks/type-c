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

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { VariablePattern } from "../symbol/VariablePattern";
import { DataType } from "../types/DataType";
import { PatternExpression } from "./PatternExpression";
import { StructPatternExpression } from "./StructPatternExpression";

export class StructVariablePatternExpression extends PatternExpression {
    name: string;
    
    /**
     * Pointer to the symbol table entry for this variable
     */
    symbolPointer: VariablePattern | null = null;
    parent: StructPatternExpression | null = null;

    constructor(location: SymbolLocation, name: string) {
        super(location, "variable");
        this.name = name;
    }

    setParent(parent: StructPatternExpression){
        this.parent = parent;
    }


    infer(ctx: Context, expressionType: DataType, isConst: boolean | 0) {
        if(!this.symbolPointer) {
            this.symbolPointer = new VariablePattern(this.location, this.name, expressionType, isConst);
            ctx.addSymbol(this.symbolPointer);
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): StructVariablePatternExpression{
        let newVar = new StructVariablePatternExpression(this.location, this.name);
        //newVar.symbolPointer = this.symbolPointer; // will be set when inferred
        return newVar;
    }
}