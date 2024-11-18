/**
 * Filename: StructDeconstructionExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an array deconstruction
 *      an array deconstruction can only be used to used as a function return type
 *      let {x, y, ...rest} = f()
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Expression } from "./Expression";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Context } from "../symbol/Context";
import { StructType } from "../types/StructType";

export class StructDeconstructionExpression extends Expression {
    
    constructor(
        location: SymbolLocation,
        public structExpression: Expression,
        public field: string | null, // null if it's the remaining fields
        public visited_fields: string[] | null = null,
        public rest: boolean
    ) {
        super(location, "array_deconstruction");
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        this.setHint(hint);

        let structType = this.structExpression.infer(ctx, null);
        

        if (!structType.is(ctx, StructType)) {
            ctx.parser.customError(`Expected tuple type, got ${structType.shortname()}`, this.location);
        }

        let stType = structType.to(ctx, StructType) as StructType;


        if (this.rest){
            // we will create a new struct type with the remaining fields
            let remainingFields = stType.fields.filter(field => !this.visited_fields!.includes(field.name)) ?? [];
            let remainingFieldsType = new StructType(this.location, remainingFields.map(field => stType.getField(field.name)!));
            this.inferredType = remainingFieldsType;

            // make sure the remaining fields are not empty
            if (remainingFields.length === 0) {
                ctx.parser.customError(`All fields of struct ${stType.shortname()} have been deconstructed, nothing left to deconstruct`, this.location);
            } else {
                this.inferredType = remainingFieldsType;
            }
        }
        else {
            // make sure the field exists in the struct
            if (stType.getField(this.field!) == null) {
                ctx.parser.customError(`Cannot deconstruct non field ${this.field} that does not exist in struct ${stType.shortname()}`, this.location);
            }

            this.inferredType = stType.getField(this.field!)!.type;
        }

        this.checkHint(ctx);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): StructDeconstructionExpression {
        return new StructDeconstructionExpression(
            this.location,
            this.structExpression.clone(typeMap, ctx),
            this.field,
            this.visited_fields,
            this.rest
        );
    }
}
