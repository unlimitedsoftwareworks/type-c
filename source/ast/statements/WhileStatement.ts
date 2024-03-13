/**
 * Filename: WhileStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an a while statement while x == 1 {..}
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


export class WhileStatement extends Statement {
    condition: Expression;
    body: BlockStatement;

    constructor(location: SymbolLocation, condition: Expression, body: BlockStatement) {
        super(location, "while");
        this.condition = condition;
        this.body = body;
    }

    infer(ctx: Context){
        this.condition.infer(ctx, new BooleanType(this.location));
        this.body.infer(ctx);
    }
}