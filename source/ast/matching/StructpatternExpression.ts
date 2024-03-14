/**
 * Filename: StructPatternExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a struct pattern expression { x: a, y: 2, ...z }
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { LiteralExpression } from "../expressions/LiteralExpression";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { StructField, StructType } from "../types/StructType";
import { PatternExpression } from "./PatternExpression";
import { StructVariablePatternExpression } from "./StructVariablePatternExpression";

export type StructFieldPattern = {
    name: string,
    pattern: PatternExpression
}

export class StructPatternExpression extends PatternExpression {
    fieldPatterns: StructFieldPattern[];
    capturedFields: StructField[] = [];
    variablePattern: StructVariablePatternExpression | null = null;
    _inferred: boolean = false;

    constructor(location: SymbolLocation, fieldPatterns: StructFieldPattern[], structVariablePattern: StructVariablePatternExpression | null) {
        super(location, "struct");
        this.fieldPatterns = fieldPatterns;
        this.variablePattern = structVariablePattern;
    }

    infer(ctx: Context, expressionType: DataType) {
        // since we capture the fields, we only need to infer once otherwise we might run into run time error?
        if (this._inferred) return;

        if (!expressionType.is(StructType)) {
            throw ctx.parser.customError(`Cannot perform struct matching on non-struct type ${expressionType.shortname()}`, this.location);
        }

        let structType = expressionType.to(StructType) as StructType;

        for (let i = 0; i < this.fieldPatterns.length; i++) {
            let fieldPattern = this.fieldPatterns[i];
            let field = structType.fields.find(f => f.name === fieldPattern.name);
            if (!field) {
                throw ctx.parser.customError(`Struct type ${structType.shortname()} does not have field ${fieldPattern.name}`, this.location);
            }

            fieldPattern.pattern.infer(ctx, field.type);
            this.capturedFields.push(field);

            if (this.variablePattern !== null) {
                // we need to create new struct with the not-yet-captured fields
                let newFields = structType.fields.filter(f => !this.capturedFields.includes(f));

                // make sure we do not have empty struct
                if (newFields.length === 0) {
                    throw ctx.parser.customError(`Cannot create empty struct, all fields are captured`, this.location);
                }

                let newStructType = new StructType(this.location, newFields);
                this.variablePattern.infer(ctx, newStructType);
            }
        }
        this._inferred = true;
    }
}