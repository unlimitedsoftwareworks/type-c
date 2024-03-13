/**
 * Filename: ThisExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a new Expression 
 *          new Array(10)
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { ProcessType } from "../types/ProcessType";
import { Expression } from "./Expression";

export class ThisExpression extends Expression {
    // TODO: parent process?
    parentClass: DataType | null = null;

    constructor(location: SymbolLocation) {
        super(location, "this");
    }

}