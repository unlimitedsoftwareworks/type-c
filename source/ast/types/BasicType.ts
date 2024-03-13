/**
 * Filename: BasicType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a basic data type in the type-c language, such as u8, u16, u32, 
 *     u64, i8, i16, i32, i64, f32, f64
 * 
 * Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType";

export type BasicTypeKind = "u8" | "u16" | "u32" | "u64" | "i8" | "i16" | "i32" | "i64" | "f32" | "f64"

export class BasicType extends DataType {
    constructor(location: SymbolLocation, kind: BasicTypeKind) {
        super(location, kind);
    }

    resolve(ctx: Context) {
        // nothing to do
    }

    shortname(): string {
        return this.kind
    }

    serialize(): string {
        return `@basic${this.kind}`
    }

    isAssignable(): boolean {
        // TODO: check if this is correct
        return true;
    }
}
