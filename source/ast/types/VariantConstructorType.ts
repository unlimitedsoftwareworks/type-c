/**
 * This class is used to represent a variant constructor type.
 * A variant constructor, is an instance of an algebraic data type.
 * For example:
 * tree = leaf | node, leaf and node are variant constructors.
 * tree is the variant type.
 */
import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {DataType} from "./DataType";
import { VariantType } from "./VariantType";


export class VariantParameter {
    name: string;
    type: DataType;
    location: SymbolLocation;
    constructor(location: SymbolLocation, name: string, type: DataType){
        this.location = location;
        this.name = name;
        this.type = type;
    }
}

export class VariantConstructorType  extends DataType{
    name: string;
    parameters: VariantParameter[];

    _parent: VariantType | null = null;

    constructor(location: SymbolLocation, name: string, parameters: VariantParameter[]){
        super(location, "variant_constructor")
        this.name = name;
        this.parameters = parameters;
    }

    resolve(ctx: Context) {
        // make sure all fields are valid, duplicate are already checked by the parser
        for(let field of this.parameters) {
            field.type.resolve(ctx);
        }
    }

    setParent(parent: VariantType) {
        this._parent = parent;
    }

    shortname(): string {
        return this.name+"("+this.parameters.map(f => f.name+":"+f.type.shortname()).join(",")+")"
    }

    serialize(): string {
        return `@variant_constructor{name:${this.name},parameters:[${this.parameters.map(f => `${f.name}:${f.type.serialize()}`).join(",")}]}`;
    }

}