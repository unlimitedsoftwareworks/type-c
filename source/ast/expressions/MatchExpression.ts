/**
 * Filename: MatchExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models pattern matching expression
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { findCompatibleTypes } from "../../typechecking/TypeInference";
import { PatternExpression } from "../matching/PatternExpression";
import { BlockStatement } from "../statements/BlockStatement";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { BooleanType } from "../types/BooleanType";
import { DataType } from "../types/DataType";
import { Expression } from "./Expression";

export type MatchCaseType = "match_block" | "match_expression"

/**
 * Models a single match case
 */
export class MatchCaseExpression {
    type: MatchCaseType;
    expression: Expression | null = null;
    block: BlockStatement | null = null;
    guard: Expression | null = null;
    context: Context;
    location: SymbolLocation;
    pattern: PatternExpression;

    _inferred: boolean = false;
    _inferredType: DataType | null = null;

    constructor(location: SymbolLocation, context: Context, pattern: PatternExpression, type: MatchCaseType, expression: Expression | null, block: BlockStatement | null, guard: Expression | null) {
        this.type = type;
        this.expression = expression;
        this.block = block;
        this.guard = guard;
        this.context = context;
        this.location = location;
        this.pattern = pattern;
    }

    /**
     * Infers the pattern match case, with the given expression type that is being matched.
     * also we infer using this.context, which is the context of the match expression
     * @param ctx 
     * @param expressionType 
     */
    infer(ctx: Context, expressionType: DataType, isParentConst: boolean | 0): DataType | null{
        if (this._inferred) return this._inferredType;
        this.pattern.infer(this.context, expressionType, isParentConst);

        if(this.guard) {
            this.guard.infer(this.context, null);
        }

        if(this.expression) {
            this._inferred = true;
            this._inferredType = this.expression.infer(this.context);
            return this._inferredType;
        }
        else if (this.block) {
            this.block.infer(this.context);
        }

        this._inferred = true;
        return null;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): MatchCaseExpression{
        let newCtx = new Context(this.context.location, this.context.parser, ctx, this.context.env);


        let expression = this.expression?.clone(typeMap, newCtx) || null;
        let block = this.block?.clone(typeMap, newCtx) || null;

        if(block !== null) {
            block.context.overrideParent(newCtx);
        }

        let newExpr = new MatchCaseExpression(this.location, 
            newCtx, 
            this.pattern.clone(typeMap, newCtx), 
            this.type, 
            expression, 
            block, 
            this.guard?.clone(typeMap, newCtx) || null
        );

        return newExpr;
    }
}

export class MatchExpression extends Expression {
    expression: Expression;
    cases: MatchCaseExpression[];

    constructor(location: SymbolLocation, expression: Expression, cases: MatchCaseExpression[]) {
        super(location, "match");
        this.expression = expression;
        this.cases = cases;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        let type = this.expression.infer(ctx);
        type.resolve(ctx);

        let matchExprsTypes = this.cases.map(c => c.infer(ctx, type, this.expression.isConstant)!);
        let res = findCompatibleTypes(ctx, matchExprsTypes);

        if(!res) {
            ctx.parser.customError(`No common type found for match expression`, this.location);
        }

        this.isConstant = false;
        this.inferredType = res;
        this.checkHint(ctx);
        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): MatchExpression{
        return new MatchExpression(this.location, this.expression.clone(typeMap, ctx), this.cases.map(c => 
            c.clone(typeMap, ctx)
        ));
    }
}