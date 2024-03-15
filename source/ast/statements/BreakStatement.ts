/**
 * Filename: BreakStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an break statement
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Statement } from "./Statement";

export class BreakStatement extends Statement {
    constructor(location: SymbolLocation) {
        super(location, "break");
    }

    infer(ctx: Context){
        // make sure we are inside a loop
        if(!ctx.env.withinLoop) {
            ctx.parser.customError("break statement must be inside a loop", this.location);
        }
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): BreakStatement {
        return new BreakStatement(this.location);
    }
}