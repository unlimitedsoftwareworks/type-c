import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";


export class VoidType extends DataType {
    constructor(location: SymbolLocation) {
        super(location, "void");
    }

    resolve(ctx: Context) {
        // do nothing
    }

    shortname(): string {
        return "void"
    }

    serialize(unpack: boolean = false): string {
        return "@void"
    }

    clone(genericsTypeMap: {[key: string]: DataType}){
        return new VoidType(this.location);
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, typeMap: {[key: string]: DataType}) {
        // make sure originalType is a VoidType
        if(!originalType.is(ctx, VoidType)){
            throw ctx.parser.customError(`Expected void type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
        }
    }
}