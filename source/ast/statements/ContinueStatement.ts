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
import { Statement } from "./Statement";

export class ContinueStatement extends Statement {
    constructor(location: SymbolLocation) {
        super(location, "continue");
    }

    infer(ctx: Context){
        // do nothing
    }
}