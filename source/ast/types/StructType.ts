import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";

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

    allowedNullable(ctx: Context): boolean {
        return true;
    }

    clone(typeMap: { [key: string]: DataType; }): DataType {
        return new StructType(this.location, this.fields.map(f => f.clone(typeMap)));
    }
}