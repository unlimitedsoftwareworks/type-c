/**
 * Filename: Context.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Represents a symbol table.
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { TypeC } from "../../compiler";
import { Parser } from "../../parser/Parser";
import { BasePackage } from "../BasePackage";
import { LambdaExpression } from "../expressions/LambdaExpression";
import { ClassMethod } from "../other/ClassMethod";
import { ProcessMethod } from "../other/ProcessMethod";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { ProcessType } from "../types/ProcessType";
import { DeclaredFunction } from "./DeclaredFunction";
import { DeclaredType } from "./DeclaredType";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";

/**
 * We do not distinguish between local and arguments within same scope.
 */
export type SymbolScope = "local" | "global" | "upvalue";

export type ContextEnvironment = {
    withinClass: boolean;
    withinFunction: boolean;
    withinProcess: boolean;
    withinLoop: boolean;
};

type ContextOwner = BasePackage | LambdaExpression | ClassMethod | ProcessMethod | DeclaredFunction | null;

export class Context {
    /**
     * The symbols in this table.
     */
    private symbols: Map<string, Symbol> = new Map();

    /**
     * The parent of this symbol table.
     * If this is null, then this is the root symbol table.
     */
    private parent: Context | null = null;

    /**
     * The owner of this symbol table,
     * used to find the function or class that this symbol table belongs to, etc
     */
    private owner: ContextOwner = null;

    /**
     * If the context is within a class, we need this when we are resolving `this` for example
     */
    private activeClass: ClassType | null = null;

    /**
     * Same as activeClass but for processes
     */
    private activeProcess: ProcessType | null = null;

    /**
     * Pointer to the parser.
     */
    parser: Parser;

    pkg: string;

    /**
     * The environment of this symbol table.
     */
    env: ContextEnvironment = {
        withinClass: false,
        withinFunction: false,
        withinProcess: false,
        withinLoop: false,
    };

    /**
     * The location of this symbol table.
     */
    location: SymbolLocation;


    constructor(
        location: SymbolLocation,
        parser: Parser,
        parent: Context | null = null,
        env: Partial<ContextEnvironment> = {},
    ) {
        this.location = location;
        this.parser = parser;
        this.parent = parent;
        this.pkg = parser.package;

        if(parent === null){
            // default env
        }
        else {
            // inherit env
            this.env.withinClass = parent.env.withinClass || false;
            this.env.withinFunction = parent.env.withinFunction || false;
            this.env.withinProcess = parent.env.withinProcess || false;
            this.env.withinLoop = parent.env.withinLoop || false;
        }

        // override with new env
        this.env.withinClass = env.withinClass || this.env.withinClass;
        this.env.withinFunction = env.withinFunction || this.env.withinFunction;
        this.env.withinProcess = env.withinProcess || this.env.withinProcess;
        this.env.withinLoop = env.withinLoop || this.env.withinLoop;
    }

    setOwner(owner: ContextOwner) {
        this.owner = owner;
    }

    addSymbol(symbol: Symbol) {
        this.symbols.set(symbol.name, symbol);
    }

    /**
     * Forcibly overrides a symbol in the current context.
     * @param symbol 
     */
    overrideSymbol(symbol: Symbol) {
        this.symbols.set(symbol.name, symbol);
    }


    /**
     * Converts current file path to a package such as std.io.
     * @returns package name, with dots.
     */
    getCurrentPackage(){
        // replace path separators with dots
        let p =  this.pkg.replace(/\\/g, '.').replace(/\//g, '.');
        let stdlibPath = TypeC.TCCompiler.stdlibDir.replace(/\\/g, '.').replace(/\//g, '.');
        p = p.replace(stdlibPath, "~");
        // remove the extension
        p = p.replace("\.tc", "");
        // remove type-c-lib
        
        return p;
    }

    findParentFunction(): DeclaredFunction | LambdaExpression | ClassMethod | null {
        if(this.owner instanceof DeclaredFunction){
            return this.owner;
        }
        if(this.owner instanceof ClassMethod){
            return this.owner;
        }
        if(this.owner instanceof LambdaExpression){
            return this.owner;
        }
        else if(this.parent){
            return this.parent.findParentFunction();
        }
        else {
            return null;
        }
    }

    lookup(name: string): Symbol | null {
        let symbol = this.symbols.get(name);
        if(symbol !== undefined){
            return symbol;
        }
        else if(this.parent !== null){
            return this.parent.lookup(name);
        }
        else {
            return null;
        }
    }

    lookupScope(name: string): {sym: Symbol, scope: SymbolScope} | null {
        let symbol = this.symbols.get(name);
        
        if (symbol != undefined) {
            if(this.parent === null){
                return {sym: symbol, scope: "global"};
            }
            else {
                return {sym: symbol, scope: "local"};
            }
        }
        else {
            if(this.parent === null){
                return null;
            }
            else {
                let parentScope = this.parent.lookupScope(name);

                if((this.owner != this.parent.owner) && (parentScope !== null)){
                    return {sym: parentScope.sym, scope: "upvalue"};
                }
                else {
                    return parentScope;
                }
            }
        }
    }

    setActiveClass(cls: ClassType | null) {
        this.activeClass = cls;
    }

    getActiveClass(): ClassType | null {
        return this.activeClass;
    }

    setActiveProcess(proc: ProcessType | null) {
        this.activeProcess = proc;
    }

    getActiveProcess(): ProcessType | null {
        return this.activeProcess;
    }


    /**
     * Used to override parent, used after cloning a method, where the parent scope would point to the old method's root context, 
     * this is upated in the class consturctor to point to the new method's context.
     * @param parent 
     */
    overrideParent(parent: Context) {
        this.parent = parent;
    }

    getParent(): Context | null {
        return this.parent;
    }

    /**
     * Clones current context, clones the active symbols too,
     * requires a parent scope, so we do not need to clone parents recursively
     */
    clone(parent: Context, genericsTypeMap: {[key: string]: string} = {}): Context {
        let newContext = new Context(this.location, this.parser, parent, this.env);

        /**
         * TODO: check if we need to clone the symbols, or if we can just reference them
         */
        /*
        for(let key in this.symbols) {
            let v = this.symbols.get(key);

            if(v instanceof Vari) {
                newContext.addSymbol(v);
            }
        }
        */

        return newContext;
        
    }
}
