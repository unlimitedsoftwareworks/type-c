/**
 * Filename: UnsetType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models an unset type. An unset type is a type that is not yet known. (such as function return type when
       it needs to be infered)
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";
import { GenericType } from "./GenericType";


export class UnsetType extends DataType {
    constructor(location: SymbolLocation) {
        super(location, "unset");
    }

    resolve(ctx: Context) {
        /**
         * Unset datatypes are usually placeholders for when the type is not known yet.
         * Usually used for function return types, for example:
         * fn mult(x: u32, y: u32) = x * y,
         * initially mult return type is unset, until infered through the body of the function.
         */
        ctx.parser.customError("Cannot use unset type", this.location);
    }

    shortname(): string {
        return "unset"
    }

    serialize(unpack: boolean = false): string {
        return "@unset"
    }

    clone(genericsTypeMap: {[key: string]: DataType}){
        return new UnsetType(this.location);
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // nothing to do
    }
}
