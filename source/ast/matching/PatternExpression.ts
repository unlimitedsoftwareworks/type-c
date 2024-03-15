/**
 * Filename: PatternExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an abstract pattern expression
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";

export type PatternExpressionType = 
    "array" |  // [1, 2, 3]
    "struct" |  // { x: 1, y: 2 }
    "wildcard" |  // _
    "literal" |  // 1
    "datatype" |  // X.T()
    "variable" |  // z
    "array_remaining_variables" |  // [...z]
    "struct_remaining_variable"; // {...z}

export class PatternExpression {
    matchType: PatternExpressionType;
    location: SymbolLocation;

    constructor(location: SymbolLocation, matchType: PatternExpressionType) {
        this.location = location;
        this.matchType = matchType;
    }

    infer(ctx: Context, expressionType: DataType) {
        throw "Not implemented";
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): PatternExpression{
        return this;
    }
}