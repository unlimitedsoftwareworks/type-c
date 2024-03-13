/**
 * Filename: ForStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a for loop statement
 *          for let i: u32 = 0; i < 10; i++ {..}
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Expression } from "../expressions/Expression";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { BooleanType } from "../types/BooleanType";
import { BlockStatement } from "./BlockStatement";
import { Statement } from "./Statement";

export class ForStatement extends Statement {
    initializers: Statement[];
    condition: Expression | null;
    incrementors: Expression[];
    body: BlockStatement;
    context: Context;

    constructor(location: SymbolLocation, context: Context, initializers: Statement[], condition: Expression | null, incrementors: Expression[], body: BlockStatement) {
        super(location, "for");
        this.initializers = initializers;
        this.condition = condition;
        this.incrementors = incrementors;
        this.body = body;
        this.context = context;
    }

    infer(ctx: Context){
        for(const initializer of this.initializers){
            initializer.infer(this.context);
        }
        if(this.condition){
            this.condition.infer(this.context, new BooleanType(this.location));
        }
        for(const incrementor of this.incrementors){
            incrementor.infer(this.context);
        }
        this.body.infer(this.context);
    }
}