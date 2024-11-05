/**
 * Filename: CoroutineCallExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a coroutine call
 *          call c1(<args>)
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

/*
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Expression } from "./Expression";

export class CoroutineCallExpression extends Expression {

    // constructor arguments
    arguments: Expression[];

    constructor(location: SymbolLocation, arguments_: Expression[]) {
        super(location, "coroutine_call");
        this.arguments = arguments_;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        this.arguments.forEach(arg => arg.infer(ctx, hint));


        return this.inferredType!
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): CoroutineCallExpression {
        return new CoroutineCallExpression(this.location, this.arguments.map(a => a.clone(typeMap, ctx)));
    }

}
*/