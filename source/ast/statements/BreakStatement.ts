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
import { Statement } from "./Statement";

export class BreakStatement extends Statement {
    constructor(location: SymbolLocation) {
        super(location, "break");
    }

    infer(ctx: Context){
        // do nothing
    }
}