/**
 * Filename: BlockStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a block statement
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Statement } from "./Statement";

export class BlockStatement extends Statement {
    context: Context;
    statements: Statement[];

    constructor(location: SymbolLocation, context: Context, statements: Statement[]){
        super(location, "block");
        this.context = context;
        this.statements = statements;
    }

    infer(ctx: Context){
        for(const statement of this.statements){
            statement.infer(this.context);
        }
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): BlockStatement {
        let newContext = this.context.clone(ctx);
        let newStatements = this.statements.map(s => s.clone(typeMap, newContext));
        return new BlockStatement(this.location, newContext, newStatements);
    }
}