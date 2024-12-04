/**
 * Filename: EnumType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an enum type 
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/TypeChecking";
import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { BasicType, BasicTypeKind } from "./BasicType";
import {DataType} from "./DataType";
import { GenericType } from "./GenericType";

export class EnumField {
    name: string;
    // vakye is possibly a null, meaning that it is not set
    value: string | null;
    literal_type: "int_literal" | "binary_int_literal" | "oct_int_literal" | "hex_int_literal" | null = null;
    location: SymbolLocation;

    constructor(
            location: SymbolLocation, 
            name: string, 
            value: string | null = null, 
            literal_type: "int_literal" | "binary_int_literal" | "oct_int_literal" | "hex_int_literal" | null = null
        ){
        this.location = location;
        this.name = name;
        this.value = value;
        this.literal_type = literal_type;

        if((this.literal_type !== "int_literal") && (this.value !== null)) {
            // remove leading 2 chars
            this.value = this.value.substring(2);
        }
    }

    toNumber(): number {
        if(this.value === null) throw new Error("Cannot convert null to number");

        if(this.literal_type === "int_literal"){
            return parseInt(this.value);
        }
        if(this.literal_type === "binary_int_literal"){
            return parseInt(this.value, 2);
        }
        if(this.literal_type === "oct_int_literal"){
            return parseInt(this.value, 8);
        }
        if(this.literal_type === "hex_int_literal"){
            return parseInt(this.value, 16);
        }
        throw new Error("Cannot convert null to number");
    }

    clone(genericsTypeMap: {[key: string]: DataType}){
        return new EnumField(this.location, this.name, this.value, this.literal_type);
    }
}

export type EnumTargetType = "u8" | "u16" | "u32" | "u64" | "i8" | "i16" | "i32" | "i64" | "unset";

export class EnumType extends DataType {
    fields: EnumField[] = [];
    as: EnumTargetType;

    /**
     * flag to avoid resolving the datatype on every call to resolve
     */
    _resolved: boolean = false;

    constructor(location: SymbolLocation, fields: EnumField[], as: EnumTargetType | null){
        super(location, "enum");
        this.fields = fields;
        this.as = as ?? "unset";
    }

    addField(field: EnumField){
        this.fields.push(field);
    }


    resolve(ctx: Context) {
        if(this._resolved) return;
    
        if(this.fields.length === 0){
            ctx.parser.customError("An enum must have at least one field", this.location);
            return;
        }
    
        // Rule 1: Check if the first element is unset
        if(this.fields[0].value === null){
            for (const [i, field] of this.fields.entries()) {
                if (field.value !== null) {
                    ctx.parser.customError("All enum fields must be unset if the first one is unset", field.location);
                    return;
                }
                this.fields[i].value = i.toString();
                this.fields[i].literal_type = "int_literal";
            }

            // find the smallest type that can hold all the values
            let len = this.fields.length;
            if(len <= 255){
                this.setAs("u8");
            }
            else if(len <= 65535){
                this.setAs("u16");
            }
            else if(len <= 4294967295){
                this.setAs("u32");
            }
            else {
                ctx.parser.customError("Enum fields cannot be more than 4294967295", this.location);
            }
        } else {
            // TODO: fix literal types etc
            let seenValues: number[] = [];
            // Rule 2: If only the first element has a value
            let currentValue = parseInt(this.fields[0].value);
            for (let i = 1; i < this.fields.length; i++) {
                if (this.fields[i].value === null) {
                    currentValue += 1;
                    this.fields[i].value = currentValue.toString();
                    this.fields[i].literal_type = "int_literal";
                    seenValues.push(currentValue);
                } else {
                    // Rule 3: If the first element and another element have a value
                    currentValue = this.fields[i].toNumber();
                    for (let j = i + 1; j < this.fields.length; j++) {
                        if (this.fields[j].value === null) {
                            ctx.parser.customError("All enum fields must have a value if any subsequent field has a value", this.fields[j].location);
                            return;
                        }
                        currentValue += 1;
                        if (seenValues.includes(currentValue)) {
                            ctx.parser.customError("Enum fields values must be unique", this.fields[j].location);
                            return;
                        }
                        else {
                            seenValues.push(currentValue);
                        }
                    }
                    break; // All subsequent fields have values and are correctly incremented
                }
            }

            let m = Math.max(...seenValues);
            if(m <= 255){
                this.setAs("u8");
            }
            else if(m <= 65535){
                this.setAs("u16");
            } else if(m <= 4294967295){
                this.setAs("u32");
            } else {
                ctx.parser.customError("Enum fields cannot be more than 4294967295", this.location);
            }
        }
    
        this._resolved = true;
    }

    setAs(as: EnumTargetType){
        if (this.as == "unset") {
            this.as = as;
        }
    }


    shortname(): string {
        return "enum{"+this.fields.map(f => f.name).join(", ")+"}";
    }

    serialize(unpack: boolean = false): string {
        return `@enum{${this.fields.map(f => f.name + (f.value !== null ? " = " + f.value : "")).join(", ")}}`;
    }

    isAssignable(): boolean {
        return true;
    }

    clone(genericsTypeMap: {[key: string]: DataType}): EnumType{
        return new EnumType(this.location, this.fields.map(f => f.clone(genericsTypeMap)), this.as);
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // make sure originalType is an EnumType
        if(!originalType.is(ctx, EnumType)){
            ctx.parser.customError(`Expected enum type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
        }

        let enumType = originalType.to(ctx, EnumType) as EnumType;
        let res = matchDataTypes(ctx, this, enumType);
        if(!res.success){
            ctx.parser.customError(`Expected enum type ${this.shortname()}, got ${enumType.shortname()} instead.`, this.location);
        }
    }

    getFieldValue(ctx: Context, name: string): number {
        let field = this.fields.find((f) => f.name == name);
        if(!field){
            ctx.parser.customError("Enum " + this.shortname() + " does not have a field named " + name, this.location);
        }

        if(field.value == undefined){
            ctx.parser.customError("Enum " + this.shortname() + " does not have a value for field " + name, this.location);
        }

        return field.toNumber()!;
    }

    toBasicType(ctx: Context): BasicType {
        if (this.as == "unset") {
            ctx.parser.customError("Cannot convert enum type to basic type", this.location);
        }
        return new BasicType(this.location, this.as as BasicTypeKind);
    }
}