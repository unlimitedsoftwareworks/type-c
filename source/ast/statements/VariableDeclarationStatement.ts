/**
 * Filename: VariableDeclarationStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a variable declaration statement
 *          let x: u32 = 1
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { DeclaredNamespace } from "../symbol/DeclaredNamespace";
import { DeclaredVariable } from "../symbol/DeclaredVariable";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Statement } from "./Statement";



export class VariableDeclarationStatement extends Statement {
    variables: DeclaredVariable[];

    constructor(location: SymbolLocation, variables: DeclaredVariable[]){
        super(location, "stmt_let");
        this.variables = variables;
    }

    infer(ctx: Context){
        for(let variable of this.variables){
            ctx.addSymbol(variable);

            /*
             * if the parent context is a namespace,
             * we need to register the variable to the global context (global variable)
             */
            if(ctx.getOwner() instanceof DeclaredNamespace){
                ctx.registerToGlobalContext(variable);
            }

            variable.infer(ctx);
        }
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): VariableDeclarationStatement {
        let newVariables = this.variables.map(v => v.clone(typeMap, ctx));
        return new VariableDeclarationStatement(this.location, newVariables);
    }
}