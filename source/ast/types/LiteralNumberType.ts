/**
 * Filename: LiteralNumberType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models literal numbers datatype
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";
import { GenericType } from "./GenericType";

export class LiteralIntType extends DataType {
    private _byteSize: number;

    constructor(location: SymbolLocation, value: string) {
        super(location, "literal_number");

        /**
         * TODO: compute bytesize, needed for type checking, to make sure
         * the literal number fits in the type it is being assigned to.
         */
        this._byteSize = 1;
    }

    resolve(ctx: Context) {
        // do nothing
    }

    shortname(): string {
        return "literal_number"
    }

    serialize(unpack: boolean = false): string {
        return "@literal_number"
    }

    clone(genericsTypeMap: {[key: string]: DataType}): LiteralIntType{
        return new LiteralIntType(this.location, "0");
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // nothing to do
    }
}
