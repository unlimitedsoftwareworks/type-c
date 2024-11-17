/**
 * Filename: UnreachableExpression.ts
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
import { UnreachableType } from "../types/UnreachableType";
import { Expression } from "./Expression";


export class UnreachableExpression extends Expression {
    constructor(location: SymbolLocation) {
        super(location, "unreachable");
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        this.inferredType = new UnreachableType(this.location);
        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): UnreachableExpression {
        return new UnreachableExpression(this.location);
    }
}