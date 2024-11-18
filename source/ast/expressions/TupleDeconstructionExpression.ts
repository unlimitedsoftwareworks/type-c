/**
 * Filename: TupleDeconstructionExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a tuple deconstruction
 *      a tuple deconstruction can only be used to used as a function return type
 *      let (a, b) = f()
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Expression } from "./Expression";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Context } from "../symbol/Context";
import { TupleType } from "../types/TupleType";

export class TupleDeconstructionExpression extends Expression {
    
    constructor(
        location: SymbolLocation,
        public tupleExpression: Expression,
        public index: number
    ) {
        super(location, "tuple_deconstruction");
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        this.setHint(hint);

        let tupleType = this.tupleExpression.infer(ctx, null);

        if (!tupleType.is(ctx, TupleType)) {
            ctx.parser.customError(`Expected tuple type, got ${tupleType.shortname()}`, this.location);
        }

        let tuple = tupleType.to(ctx, TupleType) as TupleType;
        let indexValue = this.index

        if (indexValue < 0 || indexValue >= tuple.types.length) {
            ctx.parser.customError(`Tuple index out of bounds: ${indexValue}`, this.location);
        }

        this.inferredType = tuple.types[indexValue];
        this.checkHint(ctx);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): TupleDeconstructionExpression {
        return new TupleDeconstructionExpression(
            this.location,
            this.tupleExpression.clone(typeMap, ctx),
            this.index
        );
    }
}
