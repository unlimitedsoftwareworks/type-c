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

export class ArrayType extends DataType {
    arrayOf: DataType;
    length: number | null = null

    constructor(location: SymbolLocation, type: DataType, length: number = 0){
        super(location, "array");
        this.arrayOf = type;
        this.length = length;
    }

    resolve(ctx: Context) {
        this.arrayOf.resolve(ctx);
    }

    shortname(): string {
        return this.arrayOf.shortname() + "[]";
    }

    serialize(): string {
        return `@array{${this.arrayOf.serialize()}`;
    }

    allowedNullable(ctx: Context): boolean {
        return false;
    }
}