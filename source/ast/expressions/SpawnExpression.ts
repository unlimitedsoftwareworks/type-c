/**
 * Filename: SpawnExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a spawn a thread to run an Expression 
 *          spawn Downloader()
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { PromiseType } from "../types/PromiseType";
import { Expression } from "./Expression";

export class SpawnExpression extends Expression {

    // constructor arguments
    threadedExpr: Expression;

    constructor(location: SymbolLocation, expr: Expression) {
        super(location, "spawn");
        this.threadedExpr = expr;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        if(hint) {
            // if we have a hint, it must be a promise type
            if(!hint.is(ctx, PromiseType)) {
                throw ctx.parser.customError(`Spawn expression must return a promise type, but found ${hint.shortname()}`, this.location);
            }

            let promiseType = hint.to(ctx, PromiseType) as PromiseType;
            let elementType = this.threadedExpr.infer(ctx, promiseType.returnType);

            this.inferredType = new PromiseType(this.location, elementType);
            return this.inferredType;
        }
        else {
            let elementType = this.threadedExpr.infer(ctx, null);
            this.inferredType = new PromiseType(this.location, elementType);
            return this.inferredType;
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): SpawnExpression {
        return new SpawnExpression(this.location, this.threadedExpr.clone(typeMap, ctx));
    }
}