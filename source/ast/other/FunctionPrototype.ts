import {SymbolLocation} from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import {FunctionType} from "../types/FunctionType";
import {GenericType} from "../types/GenericType";

export class FunctionPrototype {
    header: FunctionType;
    generics: GenericType[]
    name: string;
    location: SymbolLocation;

    constructor(location: SymbolLocation, name: string, header: FunctionType, generics: GenericType[] = []){
        this.location = location;
        this.name = name;
        this.header = header;
        this.generics = generics;
    }

    clone(typeMap: {[key: string]: DataType}): FunctionPrototype {
        return new FunctionPrototype(this.location, this.name, this.header.clone(typeMap), this.generics);
    }

    serialize(unpack: boolean = false): string {
        return `@functionprototype{name:${this.name},header:${this.header.serialize(unpack)},generics:[${this.generics.map(g => g.serialize(unpack)).join(",")}]`
    }

    toString() {
        return this.serialize();
    }
}