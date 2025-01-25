/**
 * Filename: NamespaceType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a namespace type
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Documentation } from "../../lexer/Documentation";
import { Context } from "../symbol/Context";
import { DeclaredFFI } from "../symbol/DeclaredFFI";
import { DeclaredNamespace } from "../symbol/DeclaredNamespace";
import { Symbol } from "../symbol/Symbol";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType";
import { GenericType } from "./GenericType";

export class NamespaceType extends DataType {
    ns: DeclaredNamespace;
    documentation: Documentation | null = null;
    
    constructor(location: SymbolLocation, ns: DeclaredNamespace) {
        super(location, "namespace_type");
        this.ns = ns;
    }

    resolve(ctx: Context) {
        // nothing to do
        this.ns.infer();
    }

    serializeCircular(): string {
        return `@namespace_type{id:${this.ns.uid}}`
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // nothing to do
    }

    /**
     * Returns true if the datatype can be wrapped by a nullable such as X?
     * Otherwise false.
     */
    allowedNullable(ctx: Context): boolean {
        // default behavior is to return false
        return false;
    }

    /**
     * Returns true if the type is assignable to the other type, false otherwise
     * for example, constant types are not assignable to non-constant types
     */
    isAssignable(): boolean {
        return false;
    }

    lookup(name: string): Symbol | null {
        return this.ns.ctx.lookup(name);
    }

    getContext(): Context {
        return this.ns.ctx;
    }

    setDocumentation(doc: Documentation | null) {
        this.documentation = doc;
    }
}