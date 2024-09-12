/**
 * Filename: ArrayDeconstructionExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an array deconstruction
 *      an array deconstruction can only be used to used as a function return type
 *      let [a, _, b, ...rest] = f()
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Expression } from "./Expression";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Context } from "../symbol/Context";
import { ArrayType } from "../types/ArrayType";

export class ArrayDeconstructionExpression extends Expression {
    
    constructor(
        location: SymbolLocation,
        public arrayExpression: Expression,
        public index: number,
        public rest: boolean
    ) {
        super(location, "array_deconstruction");
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        this.setHint(hint);

        let arrayType = this.arrayExpression.infer(ctx, null);

        if (!arrayType.is(ctx, ArrayType)) {
            throw ctx.parser.customError(`Expected tuple type, got ${arrayType.shortname()}`, this.location);
        }

        if(this.rest) {
            this.inferredType = arrayType;
            this.checkHint(ctx);
            return this.inferredType;
        }
        
        let arrType = arrayType.to(ctx, ArrayType) as ArrayType;

        this.inferredType = arrType.arrayOf;
        this.checkHint(ctx);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ArrayDeconstructionExpression {
        return new ArrayDeconstructionExpression(
            this.location,
            this.arrayExpression.clone(typeMap, ctx),
            this.index,
            this.rest
        );
    }
}
