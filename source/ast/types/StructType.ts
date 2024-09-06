import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { GenericType } from "./GenericType";
import { getDataTypeByteSize } from "../../codegenerator/utils";

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

    getStructSize(ctx: Context){
        let sum: number = 0;
        for(let field of this.fields){
            sum += getDataTypeByteSize(field.type)
        }
        return sum;
    }

}