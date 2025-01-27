/**
 * Filename: CoroutineConstructionExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a coroutine construction expression
 *     coroutine { ... }
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Expression, InferenceMeta } from "./Expression";
import { Statement } from "../statements/Statement";
import { CoroutineType } from "../types/CoroutineType";
import { FunctionType } from "../types/FunctionType";

export class CoroutineConstructionExpression extends Expression {
    // the function to be called
    baseFn: Expression;

    constructor(location: SymbolLocation, fn: Expression) {
        super(location, "coroutine_construction");
        this.baseFn = fn;
    }

    infer(ctx: Context, hint: DataType | null, meta?: InferenceMeta): DataType {
        // hint is ignored for coroutine construction
        this.baseFn.infer(ctx, null, meta);

        // make sure baseFn is a function
        if(!this.baseFn.inferredType!.is(ctx, FunctionType)) {
            ctx.parser.customError(`Cannot construct coroutine from non-function expression`, this.location);
        }

        let fnType = this.baseFn.inferredType!.to(ctx, FunctionType) as FunctionType;
        // make sure the function is coroutine compatible
        if(!fnType.isCoroutine) {
            ctx.parser.customError(`Function is not coroutine compatible`, this.baseFn.location);
        }

        this.inferredType = new CoroutineType(this.location, fnType);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType }, ctx: Context): CoroutineConstructionExpression {
        return new CoroutineConstructionExpression(this.location, this.baseFn.clone(typeMap, ctx));
    }
}