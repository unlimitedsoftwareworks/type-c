/**
 * Filename: ArrayPatternExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an array pattern expression [1, 2, 3, z, ...y]
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { PatternExpression } from "./PatternExpression";

export class ArrayPatternExpression extends PatternExpression {
    elements: PatternExpression[];

    constructor(location: SymbolLocation, elements: PatternExpression[]) {
        super(location, "array");
        this.elements = elements;
    }
}