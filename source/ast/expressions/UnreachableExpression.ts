/**
 * Filename: Expression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an unreachable expression, which will throw an error at runtime
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Expression } from "./Expression";


export class UnreachableExpression extends Expression {
    constructor(location: SymbolLocation) {
        super(location, "unreachable");
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        if(!hint){
            throw new Error("Unreachable expression must have a hint");
        }
        this.inferredType = hint;
        return hint;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): UnreachableExpression {
        return new UnreachableExpression(this.location);
    }
}