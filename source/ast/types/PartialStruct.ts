/**
 * Filename: PartialStruct.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models the type of `partial struct`, which is a struct that has some fields set but
 *      defined at runtime.
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";
import { GenericType } from "./GenericType";
import { StructType } from "./StructType";

export class PartialStructType extends DataType {
    structType: DataType;

    constructor(location: SymbolLocation, structType: DataType) {
        super(location, "partial_struct");
        this.structType = structType;
    }

    resolve(ctx: Context) {
        if(this.preResolveRecursion()){
            return;
        }

        this.structType.resolve(ctx);

        // make sure the struct type is a struct
        if(!this.structType.is(ctx, StructType)){
            ctx.parser.customError("Partial struct must be based on a struct type", this.location);
        }

        this.postResolveRecursion();
    }

    // can be nullable
    allowedNullable(ctx: Context): boolean {
        return true;
    }

    getStructType(ctx: Context): StructType {
        return this.structType.to(ctx, StructType) as StructType;
    }

    shortname(): string {
        return "partial<" + this.structType.getShortName() + ">"
    }

    serializeCircular(): string {
        return `@partial{${this.structType.serialize()}}`
    }

    clone(genericsTypeMap: {[key: string]: DataType}): PartialStructType{
        return new PartialStructType(this.location, this.structType.clone(genericsTypeMap));
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        if(this.preGenericExtractionRecursion()){
            return;
        }

        // make sure originalType is an Array
        if(!originalType.is(ctx, PartialStructType)){
            ctx.parser.customError(`Expected partial struct type when mapping generics to types, got ${originalType.getShortName()} instead.`, this.location);
        }

        let partialType = originalType.to(ctx, PartialStructType) as PartialStructType;
        this.structType.getGenericParametersRecursive(ctx, partialType.structType, declaredGenerics, typeMap);

        this.postGenericExtractionRecursion();
    }
}
