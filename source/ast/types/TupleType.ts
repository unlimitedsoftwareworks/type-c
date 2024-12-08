/**
 * Filename: TupleType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a tuple datatype, which is simpty a list of types (u8, u16, Xyz, etc.)
 *
 * Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { GenericType } from "./GenericType";

export class TupleType extends DataType {
    types: DataType[] = [];
    length: number = 0;

    constructor(location: SymbolLocation, types: DataType[]){
        super(location, "tuple");
        this.types = types;
        this.length = types.length;

        if(this.length <= 1){
            throw new Error("TupleType must have at least two elements!");
        }
    }

    resolve(ctx: Context) {
        if(this.preResolveRecursion()){
            return;
        }

        for(let type of this.types){
            type.resolve(ctx);
        }

        this.postResolveRecursion()
    }

    shortname(): string {
        return `(${this.types.map(t => t.getShortName()).join(", ")})`;
    }

    serialize(unpack: boolean = false): string {
        return `@tuple{${this.types.map(t => t.serialize(unpack)).join(", ")}}`;
    }

    allowedNullable(ctx: Context): boolean {
        return false;
    }

    clone(genericsTypeMap: {[key: string]: DataType}): TupleType{
        return new TupleType(this.location, this.types.map(t => t.clone(genericsTypeMap)));
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        if(this.preGenericExtractionRecursion()){
            return;
        }

        // make sure originalType is an Array
        if(!originalType.is(ctx, TupleType)){
            ctx.parser.customError(`Expected array type when mapping generics to types, got ${originalType.getShortName()} instead.`, this.location);
        }

        let tupleType = originalType.to(ctx, TupleType) as TupleType;
        for(let i = 0; i < this.types.length; i++){
            this.types[i].getGenericParametersRecursive(ctx, tupleType.types[i], declaredGenerics, typeMap);
        }

        this.postGenericExtractionRecursion();
    }
}
