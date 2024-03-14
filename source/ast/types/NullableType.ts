import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";

/**
 * Represents a nullable type.
 * A nullable type can be assigned to null, or to the type it wraps.
 */
export class NullableType extends DataType {
    type: DataType;

    constructor(location: SymbolLocation, type: DataType) {
        super(location, "nullable");
        this.type = type;
    }

    resolve(ctx: Context) {
        if(this.type instanceof NullableType) {
            throw ctx.parser.customError("Cannot have nested nullable types", this.type.location);
        }

        this.type.resolve(ctx);
    }

    shortname(): string {
        return this.type.shortname()+"?";
    }

    denull(): DataType {
        return this.type;
    }

    denullReference(): DataType {
        return this.type;
    }

    serialize(): string {
        return `@nullable{type:${this.type.serialize()}}`
    }

    to(ctx: Context, targetType: new (...args: any[]) => DataType): DataType {
        if(targetType === NullableType) return this;
        return this.type.to(ctx, targetType);
    }
}