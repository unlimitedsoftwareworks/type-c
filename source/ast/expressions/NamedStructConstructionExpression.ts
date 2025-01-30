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

import { getSubStruct, matchDataTypes, mergeStructs, reduceStructFields } from "../../typechecking/TypeChecking";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { PartialStructType } from "../types/PartialStruct";
import { StructField, StructType } from "../types/StructType";
import { isRHSConstSafe } from "./BinaryExpression";
import { ElementExpression } from "./ElementExpression";
import { Expression, InferenceMeta } from "./Expression";
import { MemberAccessExpression } from "./MemberAccessExpression";

export type KeyValueExpressionPair = {
    name: string,
    value: Expression,
    location: SymbolLocation
}

export class StructKeyValueExpressionPair {
    name: string
    value: Expression
    isPartial: boolean = false
    location: SymbolLocation

    constructor(location: SymbolLocation, name: string, value: Expression) {
        this.name = name;
        this.value = value;
        this.location = location;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): StructKeyValueExpressionPair {
        return new StructKeyValueExpressionPair(this.location, this.name, this.value.clone(typeMap, ctx));
    }
}

export class StructUnpackedElement {
    expression: Expression
    location: SymbolLocation

    constructor(location: SymbolLocation, expression: Expression) {
        this.expression = expression;
        this.location = location;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): StructUnpackedElement {
        return new StructUnpackedElement(this.location, this.expression.clone(typeMap, ctx));
    }
}

export class NamedStructConstructionExpression extends Expression {
    fields: (StructKeyValueExpressionPair | StructUnpackedElement)[];

    // extracted key-value pairs from unpacked structs
    // duplicates are removed, for example x = {y: 10, z:2}, a = {y:1, ...x}
    // plainKeyValues for a  = {y: 10, z:2}
    _plainKeyValues: StructKeyValueExpressionPair[] = [];

    constructor(location: SymbolLocation, fields: (StructKeyValueExpressionPair | StructUnpackedElement)[]) {
        super(location, "named_struct_construction");
        this.fields = fields;
    }

    infer(ctx: Context, hint: DataType | null, meta?: InferenceMeta): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);
        let structHint: StructType | null = null;
        if (hint) {
            // make sure the hint is a struct
            if (!hint.is(ctx, StructType) && !hint.is(ctx, PartialStructType)) {
                ctx.parser.customError(`Cannot create a named struct from a non-struct type ${hint.getShortName()}`, this.location);
            }

            // the hint may not contain all the fields present in the name struct construction
            if(hint.is(ctx, PartialStructType)){
                structHint = (hint.to(ctx, PartialStructType) as PartialStructType).getStructType(ctx);
            }
            else {
                structHint = hint.to(ctx, StructType) as StructType;
            }
        }

        let hasUnpacked = false;
        let isAnyFieldConstant = false;

        let fields: StructField[] = [];
        let pairs: StructKeyValueExpressionPair[] = [];

        let mergedStruct: StructType = new StructType(this.location, []);

        for (const field of this.fields) {
            if (field instanceof StructKeyValueExpressionPair) {
                
                // we infer as null, when we have an unpacked, to allow for partial type checking
                // and then we compare the hint against the inferred type,
                // because we want to allow partial comparaison
                let fieldHint = structHint?.getFieldTypeByName(field.name)

                let existingField = mergedStruct.getField(field.name)
                
                // we allow partial if the field already exists and is a struct
                let allowPartial = existingField && (existingField!.type.is(ctx, StructType));

                // must pre-infer with null to allow for partial type checking
                // we don;t know the nested fields of this field yet
                let newField = new StructField(field.location, field.name, field.value.infer(ctx, allowPartial ? null : fieldHint, meta));
                

                if(allowPartial) {
                    let infrAs = getSubStruct(
                        existingField!.type.to(ctx, StructType) as StructType, 
                        (field.value.inferredType!.to(ctx, StructType) as StructType).fields.map(f => f.name)
                    );

                    field.value.infer(ctx, infrAs, meta);

                    field.isPartial = true;
                    mergedStruct.fields.push(new StructField(field.location, field.name, field.value.inferredType!));
                    fields.push(new StructField(field.location, field.name, field.value.inferredType!));
                }
                else {
                    mergedStruct.fields.push(new StructField(field.location, field.name, field.value.inferredType!));
                    fields.push(newField);
                }
                
                // Check if the field's value is constant
                if (field.value.isConstant && !isRHSConstSafe(ctx, field.value)) {
                    isAnyFieldConstant = true;
                }
                pairs.push(field);
            }
            else {
                hasUnpacked = true;
                let dec = field as StructUnpackedElement;
                let inferredType = dec.expression.infer(ctx, null, meta);

                // Check if the field's value is constant
                if (dec.expression.isConstant && !isRHSConstSafe(ctx, dec.expression)) {
                    isAnyFieldConstant = true;
                }

                // now we get the inferred type of e
                if (!inferredType.is(ctx, StructType)) {
                    ctx.parser.customError(`Cannot unpack a non-struct type ${inferredType.getShortName()}`, dec.location);
                }

                let structType = inferredType.to(ctx, StructType) as StructType;
                for (const field of structType.fields) {
                    fields.push(new StructField(dec.location, field.name, field.type));
                    pairs.push(new StructKeyValueExpressionPair(dec.location, field.name, new MemberAccessExpression(dec.location,
                        dec.expression, new ElementExpression(dec.location, field.name)
                    )));
                    mergedStruct.fields.push(new StructField(dec.location, field.name, field.type));
                }
            }

            if (hasUnpacked) {
                // create a new NamedStructConstructionExpression with the new fields, to flatten it
                let expr = new NamedStructConstructionExpression(this.location, pairs);
                // we infer with null because we are not done with the inference yet
                this.inferredType = expr.infer(ctx, null, meta);
                this._plainKeyValues = expr._plainKeyValues;
                // now make the pair unique
            }
            else {
                this._plainKeyValues = pairs;
                this.inferredType = new StructType(this.location, fields);
            }

            // make sure our inferred type matches the hint, but not strictly,
            // because we can promote the fields of the struct if needed
            mergedStruct.resolve(ctx);
            this.inferredType = mergedStruct;
        }

        if (hasUnpacked) {
            // create a new NamedStructConstructionExpression with the new fields, to flatten it
            let expr = new NamedStructConstructionExpression(this.location, pairs);
            let fullStruct = expr.infer(ctx, hint, meta);
            if(!fullStruct.is(ctx, StructType)) {
                ctx.parser.customError(`Cannot create a named struct from a non-struct type ${fullStruct.getShortName()}`, this.location);
            }
            let fullStructType = fullStruct.to(ctx, StructType) as StructType;
            let res = reduceStructFields(ctx, fullStructType.fields, false, []);
            if(!res.err.success) {
                ctx.parser.customError(`Cannot create a named struct from a non-struct type ${fullStruct.getShortName()}: ${res.err.message}`, this.location);
            }

            this.inferredType = new StructType(this.location, res.fields);
        }
        else {
            this.inferredType = new StructType(this.location, fields);
        }

        this.checkHint(ctx, false);
        this.isConstant = isAnyFieldConstant;
        return this.inferredType;
    }

    setHint(hint: DataType | null) {
        this.hintType = hint;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): NamedStructConstructionExpression {
        return new NamedStructConstructionExpression(this.location, this.fields.map(f => f.clone(typeMap, ctx)));
    }
}