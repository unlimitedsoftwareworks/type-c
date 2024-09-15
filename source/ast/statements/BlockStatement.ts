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

    was_inferred: boolean = false;

    constructor(location: SymbolLocation, context: Context, statements: Statement[]){
        super(location, "block");
        this.context = context;
        this.statements = statements;
    }

    /**
     * Infers the block statement, since this can be a child of a do-expression, we need to block re-inferring,
     * if the expression is already inferred , we just return
     * @param ctx The context to infer the block statement in
     * @param allow_reinfer Whether to allow re-inferring the block statement
     * @returns The inferred type of the block statement
     */
    infer(ctx: Context, no_reinference: boolean = false){
        if(this.was_inferred && no_reinference){
            return;
        }

        for(const statement of this.statements){
            statement.infer(this.context);
        }

        this.was_inferred = true;
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): BlockStatement {
        let newContext = this.context.clone(typeMap, ctx);
        let newStatements = this.statements.map(s => s.clone(typeMap, newContext));
        return new BlockStatement(this.location, newContext, newStatements);
    }
}