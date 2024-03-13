/**
 * Filename: FunctionDeclarationStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a function declaration statement
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Expression } from "../expressions/Expression";
import { FunctionPrototype } from "../other/FunctionPrototype";
import { Context } from "../symbol/Context";
import { DeclaredFunction } from "../symbol/DeclaredFunction";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { BlockStatement } from "./BlockStatement";
import { Statement } from "./Statement";

export class FunctionDeclarationStatement extends Statement {
    
    // pointer to the symbol in the symbol table
    symbolPointer: DeclaredFunction;

    constructor(location: SymbolLocation, declFunction: DeclaredFunction) {
        super(location, "function_decl");
        this.symbolPointer = declFunction;
    }

    infer(ctx: Context){
        // TODO: need to infer the function prototype, return statements, etc. 
    }
}