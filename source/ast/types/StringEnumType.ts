/**
 * Filename: StringEnumType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a string enum type such as "read" | "write" | "execute".
 *     String enums are not treated as string during type checking. 
 *     When assigned to a string, the enum is then and only then treated as a string.
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { BuiltinModules } from "../../BuiltinModules";
import { isStringClass, matchDataTypes } from "../../typechecking/TypeChecking";
import { unescapeCString } from "../expressions/LiteralExpression";
import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { BasicType, BasicTypeKind } from "./BasicType";
import { ClassType } from "./ClassType";
import {DataType} from "./DataType";
import { GenericType } from "./GenericType";

export class StringEnumType extends DataType {
    values: string[] = [];

    constructor(location: SymbolLocation, values: string[], escape: boolean = true){
        super(location, "string_enum");
        this.values = escape ? values.map(v => unescapeCString(v)) : values;
    }

    resolve(ctx: Context): void {
        // make sure there are no duplicate values
        if(new Set(this.values).size !== this.values.length){
            ctx.parser.customError("Duplicate values in string enum", this.location);
        }
    }

    shortname(): string {
        return "("+this.values.map(e =>`"${e}"`).join(" | ")+")";
    }

    serialize(unpack: boolean = false): string {
        return `@stringEnum{${this.values.join(" | ")}}`;
    }

    isAssignable(): boolean {
        return true;
    }

    allowedNullable(ctx: Context): boolean {
        return true;
    }

    clone(genericsTypeMap: {[key: string]: DataType}): StringEnumType{
        return new StringEnumType(this.location, this.values.slice());
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // make sure originalType is an EnumType
        if(!originalType.is(ctx, StringEnumType)){
            ctx.parser.customError(`Expected enum type when mapping generics to types, got ${originalType.getShortName()} instead.`, this.location);
        }

        let enumType = originalType.to(ctx, StringEnumType) as StringEnumType;
        let res = matchDataTypes(ctx, this, enumType);
        if(!res.success){
            ctx.parser.customError(`Expected enum type ${this.getShortName()}, got ${enumType.getShortName()} instead.`, this.location);
        }
    }

    is(ctx: Context, targetType: new (...args: any[]) => DataType): boolean {
        if(targetType === ClassType) return true;
        if(targetType === StringEnumType) return true;
        return false;
    }

    to(ctx: Context, targetType: new (...args: any[]) => DataType): DataType {
        // TODO: maybe we need to handle convert o BuiltinStringType
        if(targetType === StringEnumType) return this;
        if(targetType === ClassType) return BuiltinModules.String!.to(ctx, ClassType);
        throw new Error("Invalid cast");
    }
}