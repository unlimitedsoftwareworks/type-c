/**
 * Filename: UnreachableType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an unreachable type in the type-c language, which is not taken into account when inferring types.
 *     i.e it is equal to any other type.
 * 
 * Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { matchDataTypes } from "../../typechecking/TypeChecking";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { BasicType } from "./BasicType";
import { DataType } from "./DataType";
import { GenericType } from "./GenericType";


export class UnreachableType extends DataType {
    constructor(location: SymbolLocation) {
        super(location, "unreachable");
    }

    resolve(ctx: Context) {
        // nothing to do
    }

    shortname(): string {
        return this.kind
    }

    serializeCircular(): string {
        return `@unreachable`
    }

    isAssignable(): boolean {
        // TODO: check if this is correct
        return false;
    }

    clone(genericsTypeMap: { [key: string]: DataType }): UnreachableType {
        return new UnreachableType(this.location)
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // nothing to do
    }
}
