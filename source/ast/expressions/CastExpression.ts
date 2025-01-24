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

import { canCastTypes, isStringClass, matchDataTypes } from "../../typechecking/TypeChecking";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { BasicType, ClassType, InterfaceType } from "../types";
import { DataType } from "../types/DataType";
import { NullableType } from "../types/NullableType";
import { StringEnumType } from "../types/StringEnumType";
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

    isCastUnnecessary: boolean = false;

    _alwaysNull: boolean = false;
    _alwaysTrue: boolean = false;
    _castingStringToEnum: boolean = false;

    constructor(location: SymbolLocation, expression: Expression, target: DataType, castType: "safe" | "regular" | "force" = "regular") {
        super(location, "cast_op");
        this.target = target;
        this.expression = expression;
        this.castType = castType;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        this.setHint(hint);

        let expressionType: DataType;
        // 1. infer base expression without a hint?
        if(this.castType === "regular") {
            // we do not infer with hint if it is a basic type
            // because basic types are incompatible with each other, 
            // and `as` is used to make is as such
            if (!this.target.is(ctx, BasicType)) {
                expressionType = this.expression.infer(ctx, this.target);
            }
            else {
                expressionType = this.expression.infer(ctx, null);
            }
        }
        else {
            expressionType = this.expression.infer(ctx, null);
        }
        
        // 2. Check if we can cast to the target type
        let r = canCastTypes(ctx, this.target, expressionType);

        if(!r.success && (this.castType === 'regular')) {
            let r = canCastTypes(ctx, this.target, expressionType);
            ctx.parser.customError(`Cannot cast ${expressionType.getShortName()} to ${this.target.getShortName()}: ${r.message}`, this.location);
        }

        if(r.success && (this.castType === 'force')) {
            ctx.parser.customWarning(`Unnecessary forced cast from ${expressionType.getShortName()} to ${this.target.getShortName()}`, this.location);
            this.isCastUnnecessary = true;
        }

        if(r.success && (this.castType === 'safe')) {
            ctx.parser.customWarning(`Unnecessary safe cast from ${expressionType.getShortName()} to ${this.target.getShortName()}`, this.location);
            this.isCastUnnecessary = true;
        }

        // post process this.target
        if(this.castType === 'safe') {
            // when reinferring same expression, it can create nested nullable types
            // which is inacceptable, so we check if the target is already nullable
            if(!this.target.is(ctx, NullableType)) {
                // make sure that the target can be nullable
                if(!this.target.allowedNullable(ctx)) {
                    ctx.parser.customError("Cannot cast to a non-nullable type", this.target.location);
                }
                this.target = new NullableType(this.location, this.target);
            }

            // an additional check here is to make sure our casting makes sense.
            // i.e we have expression of type class and we want to cast it to an interface

            let nonNullTarget = this.target.denull();

            let res = matchDataTypes(ctx, nonNullTarget, expressionType);
            if(res.success) {
                this._alwaysTrue = true;
            }
            else if (nonNullTarget.is(ctx, InterfaceType) && expressionType.is(ctx, ClassType)) {
                // we are casting a class to an interface, so we need to check if the class implements the interface
                let res = matchDataTypes(ctx, nonNullTarget, expressionType);
                if(!res.success) {
                    ctx.parser.customWarning(`Safe cast guarenteed to fail from ${expressionType.getShortName()} to ${this.target.getShortName()}`, this.location);
                    this._alwaysNull = true;
                }
            }
            else if (isStringClass(ctx, expressionType) && (nonNullTarget.is(ctx, StringEnumType))) {
                // we are casting a string to a string enum, so we need to check if the string is a valid enum value
                this._castingStringToEnum = true;
            }
        }

        // we do not use internal checkHint since we need to check based on the castType
        //if(!hint) {
        if(hint) {
            this.inferredType = this.target;
            let res = matchDataTypes(ctx, this.target, hint);
            if(!res.success && (this.castType !== 'force')) {
                ctx.parser.customError(`Cannot cast ${this.target.getShortName()} to ${hint.getShortName()}: ${res.message}`, this.location);
            }
            else if (!res.success && (this.castType === 'force')) {
                ctx.parser.customWarning(`Dangerous forced cast from ${this.target.getShortName()} to ${hint.getShortName()}: ${res.message}`, this.location);
            }
        }

        this.inferredType = this.target;

        this.isConstant = this.expression.isConstant;
        this.checkHint(ctx);
        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): CastExpression{
        return new CastExpression(this.location, this.expression.clone(typeMap, ctx), this.target.clone(typeMap), this.castType);
    }
}