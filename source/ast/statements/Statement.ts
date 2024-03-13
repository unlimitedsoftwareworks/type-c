/**
 * Filename: Statement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an abstract Statement
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";

export type StatementKind = "stmt_expression" | "stmt_let" | "function_decl" | "ifelse" | "match" 
| "for" | "foreach" | "while" | "do" | "break" | "continue" | "return" | "block"; 

export class Statement {
    kind: StatementKind;
    location: SymbolLocation;

    constructor(location: SymbolLocation, kind: StatementKind){
        this.location = location;
        this.kind = kind;
    }

    infer(ctx: Context){
        throw new Error("infer is not implemented on abstract Statement");
    }
}