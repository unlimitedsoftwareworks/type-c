/**
 * Filename: FunctionGenerator.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Generate IR instructions for a function/class method or a lambda function 
 *     or global code (if attribute isGlobal is set to true)
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { LambdaDefinition } from "../ast/expressions/LambdaExpression";
import { ClassMethod } from "../ast/other/ClassMethod";
import { DeclaredFunction } from "../ast/symbol/DeclaredFunction";
import { SymbolLocation } from "../ast/symbol/SymbolLocation";
import { IRInstruction, IRInstructionType } from "./IR";

export type FunctionGenType = DeclaredFunction | ClassMethod | LambdaDefinition;

export class FunctionGenerator  {
    // IR instructions
    instructions: IRInstruction[] = [];

    // current function being generated
    fn: FunctionGenType;

    // is global code
    isGlobal: boolean;

    // tmp variables counter
    tmpCounter = 0;

    // labels counter
    lblCounter = 0;

    // graph coloring output
    coloring: Map<string, number> = new Map();

    // spilled variables maps
    spills: Map<string, number> = new Map();

    generateTmp(): string {
        return "tmp_" + (this.tmpCounter++);
    }

    generateLabel(): string {
        return "lbl_" + this.fn.uid + ("_" + this.lblCounter++);
    }
    
    constructor(fn: FunctionGenType, isGlobal: boolean = false) {
        this.fn = fn;
        this.isGlobal = isGlobal;
    }

    // generates an IR instruction
    i(type: IRInstructionType, ...args: (string | number)[]) {
        if(type == null) {
            throw new Error("IR instruction type is null");
        }

        this.instructions.push(new IRInstruction(type, args));
    }
}