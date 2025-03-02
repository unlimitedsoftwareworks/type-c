/**
 * Filename: BasePackage.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Provides the highest level of a package
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {Context} from "./symbol/Context";
import {ImportNode} from "./ImportNode";
import {CompilerLogs, Parser} from "../parser/Parser";
import { SymbolLocation } from "./symbol/SymbolLocation";
import { DeclaredFFI } from "./symbol/DeclaredFFI";
import { DeclaredType } from "./symbol/DeclaredType";
import { Statement } from "./statements/Statement";
import { FunctionCodegenProps } from "../codegenerator/FunctionCodegenProps";
import { GlobalContext } from "../codegenerator/GlobalContext";
import { DeclaredNamespace } from "./symbol/DeclaredNamespace";
import { BlockStatement } from "./statements/BlockStatement";

export class BasePackage {
    ctx: Context;
    imports: ImportNode[] = [];
    statements: Statement[] = [];
    logs: CompilerLogs[] = [];

    /**
     * Namespace statements are stored within namespaceStatements field,
     * so that they are taken part into global variables assignment.
     * The reason why we do not store them into `statements` field is that
     * we do not want them to be taken part in type inference, since they are
     * only used for global variables assignment.
     */
    namespaceStatements: Statement[] = [];

    /**
     * Code gen properties, in a base package and only in a base package,
     * this represents global variables!
     */
    codeGenProps: FunctionCodegenProps = new FunctionCodegenProps();

    globalCtx: GlobalContext = new GlobalContext();

    staticClassBlocks: BlockStatement[] = [];

    // list of files on which this package depends on
    dependencies: string[] = [];

    hasErrors: boolean = false;

    constructor(parser: Parser) {
        this.ctx = new Context(new SymbolLocation(parser.lexer.filepath, 0, 0, 0), parser);
        // set the owner of the symbol table to this package
        this.ctx.setOwner(this);
        this.ctx.globalContext = this.globalCtx;
        this.hasErrors = false;
    }

    addImport(node: ImportNode) {
        this.imports.push(node);
    }

    addFFI(ffi: DeclaredFFI) {
        this.ctx.addSymbol(ffi);
    }

    addType(type: DeclaredType) {
        this.ctx.addSymbol(type);

        /*
        if(type.type instanceof VariantType) {
            // we register its subtypes
            for(let constructor of type.type.constructors) {
                let name = type.name + "." + constructor.name;
                this.ctx.addSymbol(new DeclaredType(constructor.location, type.parentContext, name, constructor, type.genericParameters, type.parentPackage));
            }
        }
         */
    }

    addNamespace(namespace: DeclaredNamespace){
        this.ctx.addSymbol(namespace)
    }

    addStatement(stmt: Statement) {
        this.statements.push(stmt);
    }


    addNamespaceStatement(stmt: Statement) {
        this.namespaceStatements.push(stmt);
    }

    addStaticClassBlocks(block: BlockStatement) {
        this.staticClassBlocks.push(block);
    }

    infer(){
        // infer namespace statements
        for(const [_, sym] of this.globalCtx.globalSymbols){
            if(sym instanceof DeclaredNamespace){
                sym.infer();
            }
        }
        
        for(const statement of this.statements){
            statement.infer(this.ctx);
        }


        //console.log("done infering base package "+this.ctx.location.toString())
    }

    pushLog(log: CompilerLogs) {
        this.logs.push(log);
        if(log.type == "error"){
            this.hasErrors = true;
        }
    }
}
