/**
 * Filename: TupleConstructionExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a tuple construction
 *      a tuple construction can only be used to used as a function expression fn (u32) -> (u32, u32) = (1, 2)
 *      or a return statement return (1, 2). That is why it's default infer throws an error.
 *      Any expr/statement that expects a tuple construction will call inferReturn instead of infer.
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { TupleType } from "../types/TupleType";
import { ElementExpression } from "./ElementExpression";
import { Expression, InferenceMeta } from "./Expression";

export class TupleConstructionExpression extends Expression {
    elements: Expression[];

    constructor(location: SymbolLocation, elements: Expression[]) {
        super(location, "tuple_construction");
        this.elements = elements;
    }

    infer(ctx: Context, hint: DataType | null, meta?: InferenceMeta): DataType {
        ctx.parser.customError("Tuple construction is only allowed in function return types", this.location);
    }

    /**
     * Called specially when we have an assignment (a, b) = (1, 2)
     */
    inferLHSAssginment(ctx: Context, hint: DataType | null): DataType {
        this.inferReturn(ctx, hint);

        /// with addition to all elements must be variables!
        for(let i = 0; i < this.elements.length; i++) {
            if(!(this.elements[i] instanceof ElementExpression)) {
                ctx.parser.customError("Tuple construction elements must be variables", this.location);
            }
            else {
                if (!(this.elements[i] as ElementExpression).isVariable()) {
                    ctx.parser.customError("Tuple construction elements must be variables", this.location);
                }
            }
        }

        return this.inferredType!;
    }

    inferReturn(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        if(this.elements.length <= 1) {
            ctx.parser.customError("Tuple construction must have at least two elements", this.location);
        }

        let baseHint = hint?hint.to(ctx, TupleType) as TupleType:null;

        if(baseHint == null) {
            // infer the type of the tuple
            let tupleType = new TupleType(this.location, this.elements.map(e => e.infer(ctx, null)));
            this.inferredType = tupleType;
        }
        else {
            // check if the number of elements matches the number of fields
            if(this.elements.length !== baseHint.types.length) {
                ctx.parser.customError("Tuple construction has more elements than the tuple has fields", this.location);
            }

            // check if the types of the elements match the types of the fields
            for(let i = 0; i < this.elements.length; i++) {
                this.elements[i].infer(ctx, baseHint.types[i]);
            }

            this.inferredType = baseHint;
        }

        for(let i = 0; i < this.elements.length; i++) {
            if(this.elements[i].inferredType!.is(ctx, TupleType)) {
                ctx.parser.customError("Tuple construction cannot contain other tuples", this.location);
            }
        }

        this.isConstant = false;
        if (this.inferredType === null) {
            throw new Error("Inferred type cannot be null");
        }
        return this.inferredType;
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): TupleConstructionExpression {
        let newElements = this.elements.map(e => e.clone(typeMap, ctx));
        return new TupleConstructionExpression(this.location, newElements);
    }
}