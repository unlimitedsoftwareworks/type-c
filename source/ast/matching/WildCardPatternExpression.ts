/**
 * Filename: WildCardPatternExpression
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a wildcard pattern expression _
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { PatternExpression } from "./PatternExpression";

export class WildCardPatternExpression extends PatternExpression {
    constructor(location: SymbolLocation) {
        super(location, "wildcard");
    }

    infer(ctx: Context, expressionType: DataType) {
        // Wildcard matches anything
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): WildCardPatternExpression{
        return new WildCardPatternExpression(this.location);
    }
}