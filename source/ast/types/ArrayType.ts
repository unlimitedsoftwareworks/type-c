/**
 * Filename: ArrayType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models an array type in the type-c language, such as u8[], u16[], Xyz[],
 *
 * Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { GenericType } from "./GenericType";
import { ImplementationType } from "./ImplementationType";

export class ArrayType extends DataType {
    arrayOf: DataType;
    length: number | null = null

    constructor(location: SymbolLocation, type: DataType, length: number = 0){
        super(location, "array");
        this.arrayOf = type;
        this.length = length;
    }

    resolve(ctx: Context) {
        if(this.preResolveRecursion()){
            return;
        }

        this.arrayOf.resolve(ctx);


        if(this.arrayOf.is(ctx, ImplementationType)) {
            ctx.parser.customError("Cannot have an array of implementation types", this.location);
        }

        this.postResolveRecursion();
    }

    shortname(): string {
        return this.arrayOf.getShortName() + "[]";
    }

    serializeCircular(): string {
        return `@array{${this.arrayOf.serialize()}}`;
    }

    allowedNullable(ctx: Context): boolean {
        return true;
    }

    clone(genericsTypeMap: {[key: string]: DataType}): ArrayType{
        return new ArrayType(this.location, this.arrayOf.clone(genericsTypeMap), this.length || 0);
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        if(this.preGenericExtractionRecursion()){
            return;
        }

        // make sure originalType is an Array
        if(!originalType.is(ctx, ArrayType)){
            ctx.parser.customError(`Expected array type when mapping generics to types, got ${originalType.getShortName()} instead.`, this.location);
        }

        let arrayType = originalType.to(ctx, ArrayType) as ArrayType;
        this.arrayOf.getGenericParametersRecursive(ctx, arrayType.arrayOf, declaredGenerics, typeMap);

        this.postGenericExtractionRecursion();
    }
}
