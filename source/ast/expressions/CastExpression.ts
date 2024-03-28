/**
 * Filename: CastExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a cast Expression x as Y
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { canCastTypes, matchDataTypes } from "../../typechecking/TypeChecking";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { NullableType } from "../types/NullableType";
import { Expression } from "./Expression";

export class CastExpression extends Expression {
    target: DataType;

    /**
     * Safe cast: results in a nullable if the cast fails
     * Regular cast: Ususally safe and used when the cast is guarenteed to succeed
     * Force cast: At your own risk, this cast will not check for nullability and will result in a runtime error if the cast fails
     */
    castType : "safe" | "regular" | "force" = "regular";

    // expression to cast
    expression: Expression;

    constructor(location: SymbolLocation, expression: Expression, target: DataType, castType: "safe" | "regular" | "force" = "regular") {
        super(location, "cast_op");
        this.target = target;
        this.expression = expression;
        this.castType = castType;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        this.setHint(hint);

        // 1. infer base expression without a hint
        let expressionType = this.expression.infer(ctx, null);
        
        // 2. Check if we can cast to the target type
        let r = canCastTypes(ctx, this.target, expressionType);

        if(!r.success && (this.castType === 'regular')) {
            throw ctx.parser.customError(`Cannot cast ${expressionType.shortname()} to ${this.target.shortname()}: ${r.message}`, this.location);
        }

        if(r.success && (this.castType === 'force')) {
            ctx.parser.customWarning(`Unnecessary forced cast from ${expressionType.shortname()} to ${this.target.shortname()}`, this.location);
        }

        if(r.success && (this.castType === 'safe')) {
            ctx.parser.customWarning(`Unnecessary safe cast from ${expressionType.shortname()} to ${this.target.shortname()}`, this.location);
        }

        // post process this.target
        if(this.castType === 'safe') {
            this.target = new NullableType(this.location, this.target);
        }

        // we do not use internal checkHint since we need to check based on the castType
        if(!hint) {
            this.inferredType = this.target;
        }
        else {
            let res = matchDataTypes(ctx, this.target, hint);
            if(!res.success && (this.castType !== 'force')) {
                throw ctx.parser.customError(`Cannot cast ${this.target.shortname()} to ${hint.shortname()}: ${res.message}`, this.location);
            }
            else if (!res.success && (this.castType === 'force')) {
                ctx.parser.customWarning(`Dangerous forced cast from ${this.target.shortname()} to ${hint.shortname()}: ${res.message}`, this.location);
                this.inferredType = hint;
            }
            else {
                this.inferredType = hint;
            }
        }

        this.isConstant = this.expression.isConstant;

        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): CastExpression{
        return new CastExpression(this.location, this.expression.clone(typeMap, ctx), this.target.clone(typeMap), this.castType);
    }
}