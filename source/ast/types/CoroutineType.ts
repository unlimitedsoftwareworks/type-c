/**
 * Filename: CoroutineType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a coroutine datatype
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType";
import { FunctionType } from "./FunctionType";
import { Context } from "../symbol/Context";
import { GenericType } from "./GenericType";

export class CoroutineType extends DataType {
    fnType: FunctionType; // the function type that the coroutine runs

    constructor(location: SymbolLocation, fnType: FunctionType){
        super(location, "coroutine");
        this.fnType = fnType;
    }

    resolve(ctx: Context){
        if(this.preResolveRecursion()){
            return;
        }

        this.fnType.resolve(ctx);

        this.postResolveRecursion();
    }

    clone(genericsTypeMap: {[key: string]: DataType}): CoroutineType{
        return new CoroutineType(this.location, this.fnType.clone(genericsTypeMap));
    }

    shortname(): string {
        return `@coroutine{${this.fnType.getShortName()}}`;
    }

    serializeCircular(): string {
        return `@coroutine{${this.fnType.serialize()}}`;
    }

    allowedNullable(ctx: Context): boolean {
        return true;
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        if(this.preGenericExtractionRecursion()){
            return;
        }

        // make sure originalType is a CoroutineType
        if(!originalType.is(ctx, CoroutineType)){
            ctx.parser.customError(`Expected coroutine type when mapping generics to types, got ${originalType.getShortName()} instead.`, this.location);
        }

        let coroutineType = originalType.to(ctx, CoroutineType) as CoroutineType;

        // get the generic parameters of the function type
        coroutineType.fnType.getGenericParametersRecursive(ctx, coroutineType.fnType, declaredGenerics, typeMap);

        this.postGenericExtractionRecursion()
    }
}
