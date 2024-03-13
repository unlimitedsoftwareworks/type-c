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

import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";

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
}

export type EnumTargetType = "u8" | "u16" | "u32" | "u64" | "i8" | "i16" | "i32" | "i64" | "unset";

export class EnumType extends DataType {
    fields: EnumField[] = [];
    as: EnumTargetType;

    /**
     * flag to avoid resolving the datatype on every call to resolve
     */
    _resolved: boolean = false;

    constructor(location: SymbolLocation, fields: EnumField[], as: EnumTargetType = "u32"){
        super(location, "enum");
        this.fields = fields;
        this.as = as;
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
            for (let field of this.fields) {
                if (field.value !== null) {
                    ctx.parser.customError("All enum fields must be unset if the first one is unset", field.location);
                    return;
                }
            }
        } else {
            let seenValues: number[] = [];
            // Rule 2: If only the first element has a value
            let currentValue = parseInt(this.fields[0].value);
            for (let i = 1; i < this.fields.length; i++) {
                if (this.fields[i].value === null) {
                    currentValue += 1;
                    this.fields[i].value = currentValue.toString();
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
        }
    
        this._resolved = true;
    }

    shortname(): string {
        return "enum{"+this.fields.map(f => f.name).join(", ")+"}";
    }

    serialize(): string {
        return `@enum{${this.fields.map(f => f.name + (f.value !== null ? " = " + f.value : "")).join(", ")}}`;
    }

    isAssignable(): boolean {
        return false;
    }
}