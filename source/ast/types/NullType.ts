import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";


/**
 * Represents the null type.
 * Not to be confused with the nullable type. The null type is a type that can only be null.
 * A Nullable can be assigned to null.
 */
export class NullType extends DataType {
    constructor(location: SymbolLocation) {
        super(location, "null");
    }

    resolve(ctx: Context) {
        // do nothing
    }

    shortname(): string {
        return "null"
    }

    serialize(): string {
        return "@null"
    }

    clone(genericsTypeMap: {[key: string]: DataType}): NullType{
        return new NullType(this.location);
    }
}