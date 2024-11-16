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

import { BinaryExpression } from "../expressions/BinaryExpression";
import { ElementExpression } from "../expressions/ElementExpression";
import { Expression } from "../expressions/Expression";
import { LiteralExpression } from "../expressions/LiteralExpression";
import { MemberAccessExpression } from "../expressions/MemberAccessExpression";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { StructField, StructType } from "../types/StructType";
import { PatternExpression } from "./PatternExpression";
import { checkSubPattern, PatternToExpression } from "./PatternUtils";
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

        if(this.variablePattern) this.variablePattern.setParent(this);
    }

    infer(ctx: Context, expressionType: DataType, isConst: boolean | 0) {
        // since we capture the fields, we only need to infer once otherwise we might run into run time error?
        if (this._inferred) return;

        if (!expressionType.is(ctx, StructType)) {
            throw ctx.parser.customError(`Cannot perform struct matching on non-struct type ${expressionType.shortname()}`, this.location);
        }

        let structType = expressionType.to(ctx, StructType) as StructType;

        for (let i = 0; i < this.fieldPatterns.length; i++) {
            let fieldPattern = this.fieldPatterns[i];
            let field = structType.fields.find(f => f.name === fieldPattern.name);
            if (!field) {
                throw ctx.parser.customError(`Struct type ${structType.shortname()} does not have field ${fieldPattern.name}`, this.location);
            }

            fieldPattern.pattern.infer(ctx, field.type, isConst);
            this.capturedFields.push(field);

            if (this.variablePattern !== null) {
                // we need to create new struct with the not-yet-captured fields
                let newFields = structType.fields.filter(f => !this.capturedFields.includes(f));

                // make sure we do not have empty struct
                if (newFields.length === 0) {
                    throw ctx.parser.customError(`Cannot create empty struct, all fields are captured`, this.location);
                }

                let newStructType = new StructType(this.location, newFields);
                this.variablePattern.infer(ctx, newStructType, isConst);
            }
        }
        this._inferred = true;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): StructPatternExpression {
        return new StructPatternExpression(this.location, this.fieldPatterns.map(f => ({ name: f.name, pattern: f.pattern.clone(typeMap, ctx) })), 
        this.variablePattern ? this.variablePattern.clone(typeMap, ctx) : null);
    }

    generateExpression(ctx: Context, baseExpression: Expression): PatternToExpression {
         // [baseExpression].name = [pattern]
         let argsPatterns = this.fieldPatterns.map((fieldPattern, i) => {
            let memberAccessExpression = new MemberAccessExpression(
                this.location,
                baseExpression,
                new ElementExpression(this.location, fieldPattern.name)
            );

            let checkCondition = checkSubPattern(ctx, memberAccessExpression, fieldPattern.pattern);

            return checkCondition;
        });

        if(this.variablePattern !== null){
            let checkCondition = checkSubPattern(ctx, baseExpression, this.variablePattern);
            argsPatterns.push(checkCondition);
        }

        let conditions = argsPatterns.map(e => e.condition).filter(e => e !== null).map(e => e!);
        let variables = argsPatterns.map(e => e.variableAssignments).reduce((prev, curr) => {
            return curr.concat(prev)
        }, []);

        if(conditions.length > 0){
            let finalCondition = conditions.reduce((prev, curr) => {
                return new BinaryExpression(this.location, prev, curr, "&&");
            });

            return {condition: finalCondition, variableAssignments: variables};
        }
        else {
            return {condition: null, variableAssignments: variables};
        }
        
    }
}