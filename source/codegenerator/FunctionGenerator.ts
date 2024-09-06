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
import { IRInstruction, IRInstructionType } from "./bytecode/IR";

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

    constructor(fn: FunctionGenType, isGlobal: boolean = false) {
        this.fn = fn;
        this.isGlobal = isGlobal;
    }
    
    generateTmp(): string {
        return "tmp_" + (this.tmpCounter++);
    }

    generateLabel(): string {
        return "lbl_" + this.fn.uid + ("_" + this.lblCounter++);
    }

    // generates an IR instruction
    i(type: IRInstructionType, ...args: (string | number)[]) {
        if(type == null) {
            throw new Error("IR instruction type is null");
        }

        this.instructions.push(new IRInstruction(type, args));
    }

    srcMapPushLoc(loc: SymbolLocation){
        this.i("srcmap_push_loc", loc.file, loc.line, loc.col, this.fn.name || "<unknown>");
    }

    srcMapPopLoc(){
        this.i("srcmap_pop_loc");
    }

 
    destroyTmp(reg: string) {
        this.i("destroy_tmp", reg);
    }

    generate() {
        // generate IR instructions for the function
        if (!this.isGlobal) {
            this.fn.codeGenProps.computeStack();
        }

        this.srcMapPushLoc(this.fn.location);

        if (!this.isGlobal) {
            this.i("fn", this.fn.context.uuid);
        }

        this.i("ret_f32")
        this.dumpIR();
    }

    dumpIR() {
        console.log(this.instructions);
    }
}