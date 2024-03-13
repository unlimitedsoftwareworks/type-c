/**
 * Filename: ForeachStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a foreach loop
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { BlockStatement } from "./BlockStatement";
import { Statement } from "./Statement";

export class ForeachStatement extends Statement {
    iterator: string;
    counter: string;

    body: BlockStatement;
    context: Context;

    constructor(location: SymbolLocation, context: Context, iterator: string, counter: string, body: BlockStatement) {
        super(location, "foreach");
        throw new Error("ForeachStatement is not implemented yet");
    }

    infer(ctx: Context){
        throw new Error("ForeachStatement is not implemented yet");
    }
}