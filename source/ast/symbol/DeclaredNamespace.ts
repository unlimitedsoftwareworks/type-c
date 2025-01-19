/**
 * Filename: DeclaredNamespace.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a declared namespace. Namespace can only contain types and functions.
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { BlockStatement } from "../statements/BlockStatement";
import { Statement } from "../statements/Statement";
import { VariableDeclarationStatement } from "../statements/VariableDeclarationStatement";
import { DataType } from "../types/DataType";
import { Context } from "./Context";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";

export class DeclaredNamespace extends Symbol {
    name: string;
    ctx: Context;
    statements: Statement[] = [];

    /**
     * Concrete types, incase the type declaration is a generic one.
     * When a generic type is instantiated, it will be added here
     */
    concreteTypes: Map<string, DataType> = new Map();

    _wasInferred: boolean = false;

    constructor(location: SymbolLocation, parentContext: Context, name: string){
        super(location, "namespace", name);
        this.name = name;
        this.ctx = new Context(location, parentContext.parser, parentContext);
        this.ctx.setOwner(this);
    }

    addSymbol(sym: Symbol) {
        this.ctx.addSymbol(sym);
    }

    infer(){
        if(this._wasInferred) return;
        this._wasInferred = true;

        // infer any function declarations
        for(let stmt of this.statements){
            stmt.infer(this.ctx);
        }

        // recursively infer any nested namespaces
        for(let [_, sym] of this.ctx.getSymbols().entries()){
            if(sym instanceof DeclaredNamespace){
                sym.infer();
            }
        }
    }

    addStatement(stmt: Statement) {
        this.statements.push(stmt);

        // get the base package
        let basePackage = this.ctx.getBasePackage();

        // if it is a variable declaration statement,
        // we have to wrap the statement in a block statement ,
        // so that the correct context is used
        if(stmt instanceof VariableDeclarationStatement){
            basePackage.addNamespaceStatement(new BlockStatement(this.location, this.ctx, [stmt]));
        }
    }


    getDescription(): string {
        return "namespace"
    }
    getDetails(): string {
        return this.ctx.getSymbolsList().map(s => s.getDescription()).join("\n");
    }
}
