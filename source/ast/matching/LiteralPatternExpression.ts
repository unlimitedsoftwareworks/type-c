/**
 * Filename: LiteralPatternExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a literal pattern expression 1, "hello", true, etc
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/TypeChecking";
import { Expression } from "../expressions/Expression";
import { BinaryIntLiteralExpression, BinaryStringLiteralExpression, CharLiteralExpression, DoubleLiteralExpression, FalseLiteralExpression, FloatLiteralExpression, HexIntLiteralExpression, IntLiteralExpression, LiteralExpression, NullLiteralExpression, OctIntLiteralExpression, StringLiteralExpression, TrueLiteralExpression } from "../expressions/LiteralExpression";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { PatternExpression } from "./PatternExpression";
import { PatternToExpression } from "./PatternUtils";

export class LiteralPatternExpression extends PatternExpression {
    literal: LiteralExpression;

    constructor(location: SymbolLocation, literal: LiteralExpression) {
        super(location, "literal");
        this.literal = literal;
    }

    infer(ctx: Context, expressionType: DataType, isConst: boolean | 0) {
        let r = matchDataTypes(ctx, expressionType, this.literal.infer(ctx, expressionType));
        if(!r.success) {
            ctx.parser.customError(`Cannot match ${expressionType.shortname()} against literal: ${r.message}`, this.location);
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): LiteralPatternExpression{
        return new LiteralPatternExpression(this.location, this.literal.clone(typeMap, ctx));
    }

    generateExpression(ctx: Context, baseExpression: Expression): PatternToExpression {// return a literal expression of the same base type
        let res: Expression;
        if(this.literal instanceof StringLiteralExpression){
            res = new StringLiteralExpression(this.location, this.literal.value);
        }
        else if (this.literal instanceof BinaryStringLiteralExpression){
            res = new BinaryStringLiteralExpression(this.location, this.literal.value);
        }
        else if (this.literal instanceof CharLiteralExpression){
            res = new CharLiteralExpression(this.location, this.literal.value);
        }
        else if(this.literal instanceof IntLiteralExpression){
            res = new IntLiteralExpression(this.location, this.literal.value);
        }
        else if (this.literal instanceof BinaryIntLiteralExpression){
            res = new BinaryIntLiteralExpression(this.location, this.literal.value);
        }
        else if (this.literal instanceof OctIntLiteralExpression) {
            res = new OctIntLiteralExpression(this.location, this.literal.value);
        }
        else if (this.literal instanceof HexIntLiteralExpression){
            res = new HexIntLiteralExpression(this.location, this.literal.value);
        }
        else if (this.literal instanceof FloatLiteralExpression){
            res = new FloatLiteralExpression(this.location, this.literal.value);
        }
        else if (this.literal instanceof DoubleLiteralExpression) {
            res = new DoubleLiteralExpression(this.location, this.literal.value);
        }
        else if (this.literal instanceof TrueLiteralExpression) {
            res = new TrueLiteralExpression(this.location);
        }
        else if (this.literal instanceof FalseLiteralExpression) {
            res = new FalseLiteralExpression(this.location);
        }
        else if (this.literal instanceof NullLiteralExpression) {
            res = new NullLiteralExpression(this.location);
        }
        else {
            throw new Error("Not implemented");
        }

        return {condition: res, variableAssignments: []};
    }
}