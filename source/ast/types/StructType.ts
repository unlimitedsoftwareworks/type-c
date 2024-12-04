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

    static globalFieldID = 1;
    static fieldIdMap: { [key: string]: number } = {
        "$tag": 0
    };

    static getFieldID(name: string): number {
        if (StructField.fieldIdMap[name] == undefined) {
            throw new Error(`Field ${name} does not exist`);
        }
        return StructField.fieldIdMap[name];
    }

    static registerFieldID(name: string): number {
        if (StructField.fieldIdMap[name] != undefined){
            return StructField.fieldIdMap[name];
        }
        StructField.fieldIdMap[name] = StructField.globalFieldID;
        StructField.globalFieldID++;
        return StructField.fieldIdMap[name];
    }


    constructor(location: SymbolLocation, name: string, type: DataType) {
        this.location = location;
        this.name = name;
        this.type = type;

        StructField.registerFieldID(name);
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
        if(this.preResolveRecursion()){
            return;
        }

        // make sure all fields are valid, duplicates are already checked by the parser
        for(let field of this.fields) {
            field.type.resolve(ctx);
        }

        this.postResolveRecursion()
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

    toSortedStruct() {
        // Step 1: Sort the fields by their FieldID
        const sortedFields = this.fields.sort((a, b) => a.getFieldID() - b.getFieldID());
        
        // Step 2: Prepare the Eytzinger array transformation
        const eytzingerFields = this.convertToEytzinger(sortedFields);
    
        // Debug: Log the FieldIDs in the Eytzinger order
        //console.log(eytzingerFields.map(f => f.getFieldID()));
    
        // Step 3: Return a new StructType with the transformed fields
        return new StructType(this.location, eytzingerFields);
    }
    
    // Helper method to perform the Eytzinger transformation
    convertToEytzinger(sortedFields: StructField[]): StructField[] {
        const eytzingerArray = new Array(sortedFields.length + 1); // 1-based indexing
        this.fillEytzinger(sortedFields, eytzingerArray, 0, 1); // Start with root at index 1
        return eytzingerArray.slice(1); // Convert to 0-based indexing
    }
    
    // Recursive helper to fill the Eytzinger array
    fillEytzinger(
        sortedFields: StructField[], 
        eytzingerArray: StructField[], 
        i: number, 
        k: number
    ): number {
        if (k < eytzingerArray.length) { // Ensure the current index is within bounds
            // Fill the left subtree
            i = this.fillEytzinger(sortedFields, eytzingerArray, i, 2 * k);
    
            // Assign the current element to the Eytzinger array
            eytzingerArray[k] = sortedFields[i++];
    
            // Fill the right subtree
            i = this.fillEytzinger(sortedFields, eytzingerArray, i, 2 * k + 1);
        }
        return i; // Return the updated index in sortedFields
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
