/**
 * Filename: ContinueStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an continue statement
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Statement } from "./Statement";

export class ContinueStatement extends Statement {
    constructor(location: SymbolLocation) {
        super(location, "continue");
    }

    infer(ctx: Context){
        // make sure we are inside a loop
        if(!ctx.env.withinLoop) {
            ctx.parser.customError("ccontinue statement must be inside a loop", this.location);
        }
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): ContinueStatement {
        return new ContinueStatement(this.location);
    }
}