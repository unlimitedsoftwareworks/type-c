import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";


export class UnsetType extends DataType {
    constructor(location: SymbolLocation) {
        super(location, "unset");
    }

    resolve(ctx: Context) {
        /**
         * Unset datatypes are usually placeholders for when the type is not known yet.
         * Usually used for function return types, for example:
         * fn mult(x: u32, y: u32) = x * y,
         * initially mult return type is unset, until infered through the body of the function.
         */
        ctx.parser.customError("Cannot use unset type", this.location);
    }

    shortname(): string {
        return "unset"
    }

    serialize(): string {
        return "@unset"
    }
}