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

import { BinaryExpression } from "../expressions/BinaryExpression";
import { ElementExpression } from "../expressions/ElementExpression";
import { Expression } from "../expressions/Expression";
import { IndexAccessExpression } from "../expressions/IndexAccessExpression";
import { IntLiteralExpression } from "../expressions/LiteralExpression";
import { MemberAccessExpression } from "../expressions/MemberAccessExpression";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ArrayType } from "../types/ArrayType";
import { DataType } from "../types/DataType";
import { ArrayVariablePatternExpression } from "./ArrayVariablePatternExpression";
import { PatternExpression } from "./PatternExpression";
import { buildLengthCheckExpression, checkSubPattern, PatternToExpression } from "./PatternUtils";
import { StructVariablePatternExpression } from "./StructVariablePatternExpression";
import { VariablePatternExpression } from "./VariablePatternExpression";



export class ArrayPatternExpression extends PatternExpression {
    elements: PatternExpression[];

    constructor(location: SymbolLocation, elements: PatternExpression[]) {
        super(location, "array");
        this.elements = elements;
    }

    infer(ctx: Context, expressionType: DataType, isConst: boolean | 0) {
        if(!expressionType.is(ctx, ArrayType)) {
            ctx.parser.customError(`Cannot perform array matching on non-array type ${expressionType.shortname()}`, this.location);
        }

        let arrayElement = (expressionType.to(ctx, ArrayType) as ArrayType).arrayOf;

        for(let i = 0; i < this.elements.length; i++) {
            let pattern = this.elements[i];

            if(pattern instanceof ArrayVariablePatternExpression) {
                pattern.setPosition(i)
                pattern.infer(ctx, arrayElement, isConst);
            }
            else {
                pattern.infer(ctx, arrayElement, isConst);
            }
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ArrayPatternExpression{
        return new ArrayPatternExpression(this.location, this.elements.map(e => e.clone(typeMap, ctx)));
    }


    generateExpression(ctx: Context, baseExpression: Expression): PatternToExpression {
        /**
         * Converts the array pattern matching logic into an expression that can be used to evaluate it,
         * When it comes to array matching, the most trivial check is the length of the array, it can be
         * either a min condition or an exact condition, for example:
         * [a, b, ...c] -> min condition, at least 2 elements are required. c could be an empty array
         * [a, b, c, d] -> exact condition, 4 elements are required.
         */

        let minOrExactCondition: "min" | "exact" = "min";
        let lenValue = this.elements.length;
        // first check for empty array, if so we can return the condition that array length == 0
        if(this.elements.length == 0) {
            return {
                condition: buildLengthCheckExpression(this.location, baseExpression, "exact", 0),
                variableAssignments: []
            }
        }

        // now we check the last element, if it is a variable, we need to check if it is a remaining variable
        // [a, b, ...c] -> min
        // [a, b, c, d] -> exact
        let lastElement = this.elements[this.elements.length - 1];
        if(lastElement instanceof ArrayVariablePatternExpression) {
            lenValue = lastElement.position-1;
            minOrExactCondition = "min";

        }
        else {
            minOrExactCondition = "exact";
        }
        
        let elementsExpressions: PatternToExpression[] = this.elements.map((e, i) => {
            // if array we feed base Expr
            if(e instanceof ArrayVariablePatternExpression) {
                return checkSubPattern(ctx, baseExpression, e);
            }

            let idxExpr = new IndexAccessExpression(e.location, baseExpression, [IntLiteralExpression.makeLiteral(e.location, i, "u64")]);
            return checkSubPattern(ctx, idxExpr, e);
        });

        let lengthCondition = buildLengthCheckExpression(this.location, baseExpression, minOrExactCondition, lenValue);

        // we build a base condition that be used to join all the other conditions with &&
        let baseJoinExpr = lengthCondition

        for(let i = 0; i < this.elements.length; i++) {
            if(elementsExpressions[i].condition != null) {
                baseJoinExpr = new BinaryExpression(this.location, baseJoinExpr, elementsExpressions[i].condition!, "&&");
            }
        }

        let variables = elementsExpressions.map(element => element.variableAssignments).reduce((prev, curr) => prev.concat(curr), []);
        
        return {
            condition: baseJoinExpr,
            variableAssignments: variables
        }
    }
}