/**
 * Filename: SpawnExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a spawn process Expression 
 *          spawn Downloader()
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { ProcessType } from "../types/ProcessType";
import { Expression } from "./Expression";

export class SpawnExpression extends Expression {
    type: DataType;

    // the actual class type, since the base type can be a reference
    processType: ProcessType | null = null;

    // constructor arguments
    arguments: Expression[];

    constructor(location: SymbolLocation, type: DataType, arguments_: Expression[]) {
        super(location, "spawn");
        this.type = type;
        this.arguments = arguments_;
    }
}