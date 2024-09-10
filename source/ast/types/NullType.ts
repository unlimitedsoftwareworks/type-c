import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";
import { GenericType } from "./GenericType";


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

    serialize(unpack: boolean = false): string {
        return "@null"
    }

    clone(genericsTypeMap: {[key: string]: DataType}): NullType{
        return new NullType(this.location);
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // nothing to do
    }
}