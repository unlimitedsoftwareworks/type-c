import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";

export class LiteralIntType extends DataType {
    private _byteSize: number;

    constructor(location: SymbolLocation, value: string) {
        super(location, "literal_number");

        /**
         * TODO: compute bytesize, needed for type checking, to make sure
         * the literal number fits in the type it is being assigned to.
         */
        this._byteSize = 1;
    }

    resolve(ctx: Context) {
        // do nothing
    }

    shortname(): string {
        return "literal_number"
    }

    serialize(): string {
        return "@literal_number"
    }


    clone(genericsTypeMap: {[key: string]: DataType}): LiteralIntType{
        return new LiteralIntType(this.location, "0");
    }
}
