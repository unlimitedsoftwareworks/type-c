import {SymbolLocation} from "../symbol/SymbolLocation";
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
}