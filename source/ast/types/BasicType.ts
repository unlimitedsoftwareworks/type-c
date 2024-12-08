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


import { matchDataTypes } from "../../typechecking/TypeChecking";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType";
import { GenericType } from "./GenericType";

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

    serialize(unpack: boolean = false): string {
        return `@basic:${this.kind}`
    }

    isAssignable(): boolean {
        // TODO: check if this is correct
        return true;
    }

    clone(genericsTypeMap: { [key: string]: DataType }): BasicType {
        return new BasicType(this.location, this.kind as BasicTypeKind)
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // make sure originalType matches this type
        if(!originalType.is(ctx, BasicType)){
            ctx.parser.customError(`Expected basic type when mapping generics to types, got ${originalType.getShortName()} instead.`, this.location);
        }

        let basicType = originalType.to(ctx, BasicType) as BasicType;
        let res = matchDataTypes(ctx, this, basicType);
        if(!res.success){
            ctx.parser.customError(`Expected basic type ${this.getShortName()}, got ${basicType.getShortName()} instead.`, this.location);
        }
    }
}
