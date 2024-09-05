/**
 * Filename: AwaitExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models an await Expression 
 *          await promise
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/TypeChecking";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { PromiseType } from "../types/PromiseType";
import { Expression } from "./Expression";

export class AwaitExpression extends Expression {
    expr: Expression;

    constructor(location: SymbolLocation, expr: Expression) {
        super(location, "await");
        this.expr = expr;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        // x:T = await promise<T>

        if(hint) {
            let newHint = new PromiseType(this.location, hint);
            let exprType = this.expr.infer(ctx, newHint);

            // make sure exprType is a promise type
            if(!exprType.is(ctx, PromiseType)) {
                throw ctx.parser.customError(`Expected promise type in await expression, got ${exprType.shortname()} instead`, this.location);
            }

            // get the actual type
            let promiseType = exprType.to(ctx, PromiseType) as PromiseType;
            let basePomiseType = promiseType.returnType;

            let res = matchDataTypes(ctx, basePomiseType, hint);
            if(!res.success) {
                throw ctx.parser.customError(`Type mismatch in await expression, expected ${hint.shortname()}, got ${basePomiseType.shortname()} instead: ${res.message}`, this.location);
            }

            this.inferredType = basePomiseType;
        }
        else {
            let exprType = this.expr.infer(ctx, null);

            // make sure exprType is a promise type
            if(!exprType.is(ctx, PromiseType)) {
                throw ctx.parser.customError(`Expected promise type in await expression, got ${exprType.shortname()} instead`, this.location);
            }

            // get the actual type
            let promiseType = exprType.to(ctx, PromiseType) as PromiseType;
            this.inferredType = promiseType.returnType;
        }

        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): AwaitExpression {
        return new AwaitExpression(this.location, this.expr.clone(typeMap, ctx));
    }

}