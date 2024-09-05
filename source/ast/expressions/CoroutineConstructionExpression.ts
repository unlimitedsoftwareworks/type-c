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
import { Expression } from "./Expression";
import { Statement } from "../statements/Statement";
import { CoroutineType } from "../types/CoroutineType";
import { FunctionType } from "../types/FunctionType";

export class CoroutineConstructionExpression extends Expression {
    // the function to be called
    baseFn: Expression;

    // the arguments to be passed to the function
    args: Expression[];

    constructor(location: SymbolLocation, fn: Expression, args: Expression[]) {
        super(location, "coroutine_construction");
        this.baseFn = fn;
        this.args = args;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        // hint is ignored for coroutine construction
        this.baseFn.infer(ctx, null);

        
        // make sure baseFn is a function
        if(!this.baseFn.inferredType!.is(ctx, FunctionType)) {
            throw ctx.parser.customError(`Cannot construct coroutine from non-function expression`, this.location);
        }

        let fnType = this.baseFn.inferredType!.to(ctx, FunctionType) as FunctionType;

        // make sure all args are of the correct type
        // and match the function's parameters
        
        // 1st make number of args match
        if(this.args.length != fnType.parameters.length) {
            throw ctx.parser.customError(`Incorrect number of arguments passed to coroutine, expected ${fnType.parameters.length}, got ${this.args.length}`, this.location);
        }

        // then make sure each arg is of the correct type
        for(let i = 0; i < this.args.length; i++) {
            let arg = this.args[i];
            arg.infer(ctx, fnType.parameters[i].type);
        }

        this.inferredType = new CoroutineType(this.location, fnType);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType }, ctx: Context): CoroutineConstructionExpression {
        let args = this.args.map(arg => arg.clone(typeMap, ctx));
        return new CoroutineConstructionExpression(this.location, this.baseFn.clone(typeMap, ctx), args);
    }
}
