/**
 * Filename: DataTypePatternExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a data type pattern expression X.T()
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { PatternExpression } from "./PatternExpression";

export class DataTypePatternExpression extends PatternExpression {
    type: DataType;
    args: PatternExpression[];

    constructor(location: SymbolLocation, type: DataType, args: PatternExpression[]) {
        super(location, "datatype");
        this.type = type;
        this.args = args;
    }
}