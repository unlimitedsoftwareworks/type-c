import { ClassAttribute } from "../other/ClassAttribute";
import { ClassMethod } from "../other/ClassMethod";
import { ProcessMethod } from "../other/ProcessMethod";
import { ReturnStatement } from "../statements/ReturnStatement";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType"
import { GenericType } from "./GenericType";

export class ProcessType extends DataType {

    methods: ProcessMethod[];
    attributes: ClassAttribute[];

    returnStatements: {stmt: ReturnStatement, ctx: Context}[] = [];

    constructor(location: SymbolLocation, attributes: ClassAttribute[], methods: ProcessMethod[]){
        super(location, "process");
        this.attributes = attributes;
        this.methods = methods;
    }

    shortname(): string {
        return "process"
    }

    resolve(ctx: Context) {
        throw new Error("Method not implemented.");
    }

    serialize(): string {
        throw new Error("Method not implemented.");
        //return `@process{attributes:${this.attributes.map(a => a.serialize()).join(",")},methods:${this.methods.map(m => m.serialize()).join(",")}}`
    }

    allowedNullable(ctx: Context): boolean {
        return false;
    }

    clone(genericsTypeMap: {[key: string]: DataType}): ProcessType{
        throw "Not implemented";
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        throw new Error("Method not implemented.");
    }
}