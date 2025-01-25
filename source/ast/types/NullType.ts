/**
 * Filename: NullType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models the type of `null`, not to be confused with the nullable type. The null type is a type that can only be null
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";
import { GenericType } from "./GenericType";

export class NullType extends DataType {
    constructor(location: SymbolLocation) {
        super(location, "null");
    }

    resolve(ctx: Context) {
        // do nothing
    }

    shortname(): string {
        return "null"
    }

    serializeCircular(): string {
        return "@null"
    }

    clone(genericsTypeMap: {[key: string]: DataType}): NullType{
        return new NullType(this.location);
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // nothing to do
    }
}
