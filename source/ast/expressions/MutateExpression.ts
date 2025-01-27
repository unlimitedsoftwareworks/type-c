/**
 * Filename: CastExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a mutate expression x = mutate y
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Expression, InferenceMeta } from "./Expression";
import { LiteralExpression } from "./LiteralExpression";
import { ThisExpression } from "./ThisExpression";

export class MutateExpression extends Expression {
    
    expression: Expression;

    constructor(location: SymbolLocation, expression: Expression) {
        super(location, "mutate");
        this.expression = expression;
    }

    infer(ctx: Context, hint: DataType | null, meta?: InferenceMeta): DataType {
        this.setHint(hint);

        if(this.expression instanceof ThisExpression) {
            ctx.parser.customError("`this` mutable by default", this.location);
        }

        if(this.expression instanceof LiteralExpression) {
            ctx.parser.customError("What are you doing?", this.location);
        }

        // 1. infer base expression without a hint
        let expressionType = this.expression.infer(ctx, hint, meta);

        if(!this.expression.isConstant) {
            ctx.parser.customWarning(`Unnecessary mutate expression, target is not constant.`, this.location);
        }

        this.isConstant = false;
        this.inferredType = expressionType;
        this.checkHint(ctx);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): MutateExpression{
        return new MutateExpression(this.location, this.expression.clone(typeMap, ctx));
    }
}