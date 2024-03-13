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
}