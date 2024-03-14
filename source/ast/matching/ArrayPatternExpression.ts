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

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ArrayType } from "../types/ArrayType";
import { DataType } from "../types/DataType";
import { ArrayVariablePatternExpression } from "./ArrayVariablePatternExpression";
import { PatternExpression } from "./PatternExpression";

export class ArrayPatternExpression extends PatternExpression {
    elements: PatternExpression[];

    constructor(location: SymbolLocation, elements: PatternExpression[]) {
        super(location, "array");
        this.elements = elements;
    }

    infer(ctx: Context, expressionType: DataType) {
        if(!expressionType.is(ctx, ArrayType)) {
            throw ctx.parser.customError(`Cannot perform array matching on non-array type ${expressionType.shortname()}`, this.location);
        }

        let arrayElement = (expressionType.to(ctx, ArrayType) as ArrayType).arrayOf;

        for(let i = 0; i < this.elements.length; i++) {
            let pattern = this.elements[i];

            if(pattern instanceof ArrayVariablePatternExpression) {
                pattern.setPosition(i)
                pattern.infer(ctx, arrayElement);
            }
            else {
                pattern.infer(ctx, arrayElement);
            }
        }
    }
}