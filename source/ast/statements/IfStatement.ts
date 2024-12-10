/**
 * Filename: IfStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an if statement
 *          if x == true { .. } else if y == true { .. } else { .. }
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Expression } from "../expressions/Expression";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { BooleanType } from "../types/BooleanType";
import { DataType } from "../types/DataType";
import { BlockStatement } from "./BlockStatement";
import { Statement } from "./Statement";

export class IfStatement extends Statement {
    ifBlocks: {expression: Expression, statement: BlockStatement}[];
    elseBody: BlockStatement | null;
    

    // code generation
    static _endOfBlockLabelCounter: number = 0;
    _endOfBlockLabel: string = `eoif-${IfStatement._endOfBlockLabelCounter++}`;



    constructor(location: SymbolLocation, ifBlocks: {expression: Expression, statement: BlockStatement}[], elseBody: BlockStatement | null){
        super(location, "ifelse");
        this.ifBlocks = ifBlocks;
        this.elseBody = elseBody;
    }

    infer(ctx: Context){
        for(const block of this.ifBlocks){
            block.expression.infer(ctx, null);
            block.expression.setHint(new BooleanType(block.expression.location));
            block.statement.infer(ctx);
        }
        if(this.elseBody){
            this.elseBody.infer(ctx);
        }
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): IfStatement {
        let newIfBlocks = this.ifBlocks.map(b => { return {expression: b.expression.clone(typeMap, ctx), statement: b.statement.clone(typeMap, ctx)} });
        let newElseBody = this.elseBody ? this.elseBody.clone(typeMap, ctx) : null;
        return new IfStatement(this.location, newIfBlocks, newElseBody);
    }
}