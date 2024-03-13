/**
 * Filename: UnnamedStructConstructionExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an unnamed struct construction
 *          let x: struct { a: int, b: int } = { 1, 2 }
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { Expression } from "./Expression";

export class UnnamedStructConstructionExpression extends Expression {
    elements: Expression[];

    constructor(location: SymbolLocation,elements: Expression[]) {
        super(location, "unnamed_struct_construction");
        this.elements = elements;
    }
}