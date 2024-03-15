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

    serialize(): string {
        return "@void"
    }

    clone(genericsTypeMap: {[key: string]: DataType}){
        return new VoidType(this.location);
    }
}