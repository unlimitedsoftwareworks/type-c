/**
 * Filename: UnnamedStructConstructionExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an unnamed struct construction
 *          let x: struct { a: int, b: int } = { 1, 2 }
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { StructType } from "../types/StructType";
import { Expression } from "./Expression";

export class UnnamedStructConstructionExpression extends Expression {
    elements: Expression[];

    constructor(location: SymbolLocation,elements: Expression[]) {
        super(location, "unnamed_struct_construction");
        this.elements = elements;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        if(hint === null) {
            throw ctx.parser.customError("Cannot infer type of unnamed struct construction without a hint", this.location);
        }

        if(!hint.is(ctx, StructType)) {
            throw ctx.parser.customError(`Cannot construct unnamed struct of type ${hint.shortname()}`, this.location);
        }

        let structType = hint.to(ctx, StructType) as StructType;
        // make sure the number of elements matches the number of fields
        if(this.elements.length !== structType.fields.length) {
            throw ctx.parser.customError(`Unnamed struct construction has ${this.elements.length} elements, but struct has ${structType.fields.length} fields`, this.location);
        }

        for(let i = 0; i < this.elements.length; i++) {
            let field = structType.fields[i];
            let element = this.elements[i];
            let fieldType = field.type;
            let elementType = element.infer(ctx, fieldType);
        }

        this.isConstant = false;
        this.inferredType = hint;
        // this.checkHint(ctx); not needed
        return this.inferredType;
    }
}