/**
 * Filename: NullableType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a DataType that can be null T?
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";
import { GenericType } from "./GenericType";

/**
 * Represents a nullable type.
 * A nullable type can be assigned to null, or to the type it wraps.
 */
export class NullableType extends DataType {
    type: DataType;

    constructor(location: SymbolLocation, type: DataType) {
        super(location, "nullable");
        this.type = type;
    }

    resolve(ctx: Context) {
        if(this.type instanceof NullableType) {
            throw ctx.parser.customError("Cannot have nested nullable types", this.type.location);
        }

        this.type.resolve(ctx);
    }

    shortname(): string {
        return this.type.shortname()+"?";
    }

    denull(): DataType {
        return this.type;
    }

    denullReference(): DataType {
        return this.type;
    }

    serialize(unpack: boolean = false): string {
        return `@nullable{type:${this.type.serialize(unpack)}}`
    }

    to(ctx: Context, targetType: new (...args: any[]) => DataType): DataType {
        if(targetType === NullableType) return this;
        return this.type.to(ctx, targetType);
    }

    clone(genericsTypeMap: {[key: string]: DataType}): NullableType{
        return new NullableType(this.location, this.type.clone(genericsTypeMap));
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // make sure originalType is a NullableType
        if(!originalType.is(ctx, NullableType)){
            throw ctx.parser.customError(`Expected nullable type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
        }

        let nullableType = originalType.to(ctx, NullableType) as NullableType;
        this.type.getGenericParametersRecursive(ctx, nullableType.type, declaredGenerics, typeMap);
    }

    allowedNullable(ctx: Context): boolean {
        return this.type.allowedNullable(ctx);
    }
}