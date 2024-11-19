/**
 * Filename: StructType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a struct type. A struct type is a type that contains multiple fields.
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { GenericType } from "./GenericType";
import { getDataTypeByteSize } from "../../codegenerator/utils";
import { isPointer } from "../../codegenerator/CodeGenTypes";


export class StructField {
    name: string;
    type: DataType;
    location: SymbolLocation;

    static globalFieldID = 0;
    static fieldIdMap: { [key: string]: number } = {};

    static getFieldID(name: string): number {
        if (StructField.fieldIdMap[name] == undefined) {
            throw new Error(`Field ${name} does not exist`);
        }
        return StructField.fieldIdMap[name];
    }


    constructor(location: SymbolLocation, name: string, type: DataType) {
        this.location = location;
        this.name = name;
        this.type = type;

        if (StructField.fieldIdMap[name] == undefined) {
            StructField.fieldIdMap[name] = StructField.globalFieldID;
            StructField.globalFieldID++;
        }
    }

    clone(typeMap: { [key: string]: DataType; }): StructField {
        return new StructField(this.location, this.name, this.type.clone(typeMap));
    }

    getFieldID(): number {
        return StructField.getFieldID(this.name);
    }
}

export class StructType extends DataType {
    fields: StructField[];

    constructor(location: SymbolLocation, fields: StructField[]) {
        super(location, "struct");
        this.fields = fields;
    }


    resolve(ctx: Context) {
        // make sure all fields are valid, duplicates are already checked by the parser
        for(let field of this.fields) {
            field.type.resolve(ctx);
        }
    }

    shortname(): string {
        return "struct{"+this.fields.map(f => f.name+":"+f.type.shortname()).join(",")+"}"
    }

    serialize(unpack: boolean = false): string {
        return `@struct{${this.fields.map(f => `${f.name}:${f.type.serialize(unpack)}`).join(",")}}`
    }


    getFieldTypeByName(name: string): DataType | null{
        for(let field of this.fields){
            if(field.name == name){
                return field.type;
            }
        }
        return null;
    }


    getField(name: string): StructField | null {
        for(let field of this.fields){
            if(field.name == name){
                return field;
            }
        }
        return null;
    }

    getFieldIndex(fieldName: string){
        // find the index of the field
        let index = 0;
        for(let field of this.fields){
            if(field.name == fieldName){
                return index;
            }
            index++;
        }
        return -1;
    }


    allowedNullable(ctx: Context): boolean {
        return true;
    }

    clone(typeMap: { [key: string]: DataType; }): DataType {
        return new StructType(this.location, this.fields.map(f => f.clone(typeMap)));
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        if(this.preGenericExtractionRecursion()){
            return;
        }

        // make sure originalType is a StructType
        if(!originalType.is(ctx, StructType)){
            ctx.parser.customError(`Expected struct type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
        }

        let structType = originalType.to(ctx, StructType) as StructType;
        for(let i = 0; i < this.fields.length; i++){
            // make sure field names matches
            if(this.fields[i].name != structType.fields[i].name){
                ctx.parser.customError(`Expected field ${this.fields[i].name}, got ${structType.fields[i].name} instead.`, this.location);
            }

            this.fields[i].type.getGenericParametersRecursive(ctx, structType.fields[i].type, declaredGenerics, typeMap);
        }

        this.postGenericExtractionRecursion()
    }

    // CODE GEN API
    getAlignment(): number {
        let sizes = this.fields.map(f => getDataTypeByteSize(f.type));
        return sizes.reduce((a, b) => Math.max(a, b), 0);
    }

    getStructSize(ctx: Context){
        return this.getAlignment() * this.fields.length;
    }

    getFieldOffset(fieldNum: number): number {
        let offset = 0;
        let alignment = this.getAlignment();

        return fieldNum*alignment;
    }

    toSortedStruct(){
        let sortedFields = this.fields.sort((a, b) => a.getFieldID() - b.getFieldID());
        return new StructType(this.location, sortedFields);
    }

    getFieldPointerBitMask(): number {
        let mask = 0;

        for (let i = 0; i < this.fields.length; i++) {
            // Check if the field is a pointer
            let isptr = isPointer(this.fields[i].type);

            if (isptr) {
                // Set the bit at position `i` to 1 if the field is a pointer
                mask |= (1 << i);
            }
        }

        return mask;
    }
}
