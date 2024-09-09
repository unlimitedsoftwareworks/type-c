/**
 * Filename: NamedStructConstructionExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a named struct creation.
 *          { x: 1, y: 2 }
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/TypeChecking";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { StructField, StructType } from "../types/StructType";
import { Expression } from "./Expression";

export type KeyValueExpressionPair = {
    name: string,
    value: Expression,
    location: SymbolLocation
}

export class NamedStructConstructionExpression extends Expression {
    fields: KeyValueExpressionPair[];
    
    constructor(location: SymbolLocation, fields: KeyValueExpressionPair[]) {
        super(location, "named_struct_construction");
        this.fields = fields;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        if (hint) {
            // make sure the hint is a struct
            if(!hint.is(ctx, StructType)){ 
                throw ctx.parser.customError(`Cannot create a named struct from a non-struct type ${hint.shortname()}`, this.location);
            }

            // the hint may not contain all the fields present in the name struct construction
            let structHint = hint.to(ctx, StructType) as StructType;
            this.inferredType = new StructType(this.location, this.fields.map((field) => new StructField(field.location, field.name, field.value.infer(ctx, structHint.getFieldTypeByName(field.name)))));

            let r = matchDataTypes(ctx, hint, this.inferredType);
            if(!r.success){
                throw ctx.parser.customError(`Cannot create a named struct from a non-compatible type ${hint.shortname()}: ${r.message}`, this.location);
            }

        }

        else {

            // we will have to infer the type of the struct
            let structType = new StructType(this.location, this.fields.map((field) => new StructField(field.location, field.name, field.value.infer(ctx, null))));
            this.inferredType = structType;
        }

        this.checkHint(ctx);
        this.isConstant = false;
        return this.inferredType;
    }

    setHint(hint: DataType | null){
        this.hintType = hint;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): NamedStructConstructionExpression{
        return new NamedStructConstructionExpression(this.location, this.fields.map(f => ({name: f.name, value: f.value.clone(typeMap, ctx), location: f.location})));
    }
}