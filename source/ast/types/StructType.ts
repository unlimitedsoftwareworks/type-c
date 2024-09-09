import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { GenericType } from "./GenericType";
import { getDataTypeByteSize } from "../../codegenerator/utils";
import { matchDataTypes } from "../../typechecking/TypeChecking";

export class StructField {
    name: string;
    type: DataType;
    location: SymbolLocation;

    constructor(location: SymbolLocation, name: string, type: DataType) {
        this.location = location;
        this.name = name;
        this.type = type;
    }

    clone(typeMap: { [key: string]: DataType; }): StructField {
        return new StructField(this.location, this.name, this.type.clone(typeMap));
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

    serialize(): string {
        return `@struct{${this.fields.map(f => `${f.name}:${f.type.serialize()}`).join(",")}}`
    }


    getFieldTypeByName(name: string): DataType | null{
        for(let field of this.fields){
            if(field.name == name){
                return field.type;
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
        // make sure originalType is a StructType
        if(!originalType.is(ctx, StructType)){
            throw ctx.parser.customError(`Expected struct type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
        }

        let structType = originalType.to(ctx, StructType) as StructType;
        for(let i = 0; i < this.fields.length; i++){
            // make sure field names matches
            if(this.fields[i].name != structType.fields[i].name){
                throw ctx.parser.customError(`Expected field ${this.fields[i].name}, got ${structType.fields[i].name} instead.`, this.location);
            }

            this.fields[i].type.getGenericParametersRecursive(ctx, structType.fields[i].type, declaredGenerics, typeMap);
        }
    }

    // CODE GEN API
    
    getStructSize(ctx: Context){
        let sum: number = 0;
        for(let field of this.fields){
            sum += getDataTypeByteSize(field.type)
        }
        return sum;
    }

    fieldsAligned(struct: StructType, ctx: Context){
        // check if the fields are aligned, i.e same order, same name
        if(struct.fields.length != this.fields.length){
            return false;
        }
        for(let i = 0; i < this.fields.length; i++){
            if(this.fields[i].name != struct.fields[i].name){
                return false;
            }
            if(!matchDataTypes(ctx, this.fields[i].type, struct.fields[i].type).success){
                return false;
            }
        }
        return true;
    }

    generateOffsetSwaps(struct: StructType){
        /**
         * Generate new offsets for the struct fields, based on the order of the
         * fields in the struct.
         * for example {name: string, age: u32}.generateOffsetSwaps({age: u32, name: string})
         * will return [1, 0], because the field "age" offset will be stored in the index 1 of 
         * the offset array, and the field "name" offset will be stored in the index 0 of the
         */

        let offsets: number[] = [];
        
        for(let field of struct.fields){
            let index = this.getFieldIndex(field.name);
            if(index == -1){
                throw new Error(`Field ${field.name} does not exist in struct ${this.shortname()}`);
            }
            offsets.push(index);
        }

        return offsets;
    }

    buildOffsetArray(struct: StructType){
        let offsets: number[] = [0];
        for(let i = 1; i < struct.fields.length; i++){
            offsets.push(offsets[i-1] + getDataTypeByteSize(struct.fields[i-1].type));
        }
        return offsets;
    }
}