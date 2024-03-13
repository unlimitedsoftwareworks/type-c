import { Context } from "../symbol/Context";
import { DeclaredFFI } from "../symbol/DeclaredFFI";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType";

export class FFINamespaceType extends DataType {
    parentFFI: DeclaredFFI;

    constructor(location: SymbolLocation, parentFFI: DeclaredFFI) {
        super(location, "ffi_namespace_type");
        this.parentFFI = parentFFI;
    }

    resolve(ctx: Context) {
        // nothing to do
    }

    serialize(): string {
        return `@ffi_namespace_type{id:${this.parentFFI.ffiId}}`
    }
}