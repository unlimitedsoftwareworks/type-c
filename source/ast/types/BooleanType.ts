/**
 * Filename: BooleanType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a boolean type
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { GenericType } from "./GenericType";

export class BooleanType extends DataType {
    constructor(location: SymbolLocation){
        super(location, "bool");
    }

    resolve(ctx: Context) {
        // nothing to do
    }


    shortname(): string {
        return "bool"
    }

    serializeCircular(): string {
        return "@bool"
    }


    clone(genericsTypeMap: {[key: string]: DataType}): BooleanType{
        return new BooleanType(this.location);
    }


    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // make sure originalType is a BooleanType
        if(!originalType.is(ctx, BooleanType)){
            ctx.parser.customError(`Expected boolean type when mapping generics to types, got ${originalType.getShortName()} instead.`, this.location);
        }
    }
}