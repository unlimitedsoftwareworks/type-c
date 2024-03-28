/**
 * Filename: PromiseType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a promise datatype
 *         promise<T>
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType"
import { GenericType } from "./GenericType";


export class PromiseType extends DataType {
    returnType: DataType;
    
    constructor(location: SymbolLocation, returnType: DataType) {
        super(location, "promise");
        if(returnType == null){
            throw new Error("Return type of promise cannot be null");
        }
        this.returnType = returnType;
    }

    resolve(ctx: Context) {
        this.returnType.resolve(ctx);
    }

    shortname(): string {
        return `promise<${this.returnType.shortname()}>`
    }

    serialize(): string {
        return `@promise<${this.returnType.serialize()}>`
    }

    clone(genericsTypeMap: {[key: string]: DataType}): PromiseType{
        return new PromiseType(this.location, this.returnType.clone(genericsTypeMap));
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        if(!originalType.is(ctx, PromiseType)){
            throw ctx.parser.customError(`Expected promise type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
        }

        let promiseType = originalType.to(ctx, PromiseType) as PromiseType;
        this.returnType.getGenericParametersRecursive(ctx, promiseType.returnType, declaredGenerics, typeMap);
    }

}