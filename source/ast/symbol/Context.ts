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
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { DeclaredFunction } from "./DeclaredFunction";
import { DeclaredVariable } from "./DeclaredVariable";
import { FunctionArgument } from "./FunctionArgument";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";
import { VariablePattern } from "./VariablePattern";

/**
 * We do not distinguish between local and arguments within same scope.
 */
export type SymbolScope = "local" | "global" | "upvalue";

export type ContextEnvironment = {
    withinClass: boolean;
    withinFunction: boolean;
    withinLoop: boolean;
};

type ContextOwner = BasePackage | LambdaExpression | ClassMethod |  DeclaredFunction | null;

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
     * A unique identifier for this context
     */
    static contextCount = 0;
    uuid = "ctx_"+Context.contextCount++ // Math.random().toString(36).substring(7);

    // number of symbols owned by this context.
    symbolCount: number = 0;

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
            this.env.withinLoop = parent.env.withinLoop || false;
        }

        // override with new env
        this.env.withinClass = env.withinClass || this.env.withinClass;
        this.env.withinFunction = env.withinFunction || this.env.withinFunction;
        this.env.withinLoop = env.withinLoop || this.env.withinLoop;
    }

    setOwner(owner: ContextOwner) {
        this.owner = owner;
    }

    addSymbol(symbol: Symbol) {
        let v = this.lookupLocal(symbol.name);
        if(v !== null){
            throw this.parser.customError(`Symbol ${symbol.name} already declared in this scope`, symbol.location);
        }

        let v2 = this.lookup(symbol.name);
        if(v2 !== null){
            this.parser.customWarning(`Symbol ${symbol.name} defined in ${symbol.location.toString()} shadows symbol defined in ${v2.location.toString()}`, symbol.location);
        }

        if(symbol.uid.length !== 0) {
            throw new Error("Symbol already has a UID");
        }

        symbol.uid = this.uuid + "_" + symbol.name + "_" + this.symbolCount++;
        
        this.symbols.set(symbol.name, symbol);
        symbol.parentContext = this;
    }

    // adds a symbol to the current context, but does not set the parent context
    // i.e does not take ownership of the symbol
    addExternalSymbol(symbol: Symbol, name: string) {
        this.symbols.set(name, symbol);
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

    /**
     * Sometimes, we could be within a lambda function within a class method, and we need to retrieve the actual method,
     * hence we use this method
     */
    findParentClassMethod(): ClassMethod | null {
        if(this.owner instanceof ClassMethod) {
            return this.owner;
        }
        if(this.parent) {
            return this.parent.findParentClassMethod();
        }
        return null;
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

    /**
     * lookupScope is called when a terminal symbol is found, and is being resolved.
     * This method not only resolves the symbol, but also injects the symbol into the parent function's local scope,
     * preparing for code generation.
     * @param name 
     * @returns symbol and its scope if found, otherwise null.
     */
    lookupScope(name: string): {sym: Symbol, scope: SymbolScope} | null {
        let symbol = this.symbols.get(name);
        
        if (symbol != undefined) {
            if(this.parent === null){
                return {sym: symbol, scope: "global"};
            }
            else {
                // register the local variable
                let owner = this.findParentFunction();
                if(owner !== null){
                    if((symbol instanceof DeclaredVariable) || (symbol instanceof VariablePattern)) {
                        // a variable pattern is a local variable too
                        owner.codeGenProps.registerLocalSymbol(symbol);
                    }
                    else if (symbol instanceof FunctionArgument) {
                        // we do not need to register arguments, since they are already registered
                        // when the method/function is created
                        // instead we mark it as used
                        owner.codeGenProps.markArgSymbolAsUsed(symbol);
                    }
                }

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

    lookupLocal(name: string): Symbol | null {
        let symbol = this.symbols.get(name);
        if(symbol !== undefined){
            return symbol;
        }
        else {
            return null;
        }
    }

    setActiveClass(cls: ClassType | null) {
        this.activeClass = cls;
    }

    getActiveClass(): ClassType | null {
        if(this.activeClass) {
            return this.activeClass;
        }
        if(this.parent){
            return this.parent.getActiveClass();
        }
        else {
            return null;
        }
    }

    getActiveMethod(): ClassMethod | null {
        if(this.owner instanceof ClassMethod){
            return this.owner;
        }
        if(this.parent){
            return this.parent.getActiveMethod();
        }
        return null;
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
     * upvalue dependencies are already set by lookupScope,
     * maybe we do not need this
     * @param symbol 
     */
    addUpvalueDependency(symbol: Symbol) {

    }

    /**
     * Clones current context, clones the active symbols too,
     * requires a parent scope, so we do not need to clone parents recursively
     */
    clone(typeMap: {[key: string]: DataType}, parent: Context | null): Context {
        let newContext = new Context(this.location, this.parser, parent || this.parent, this.env);
        newContext.activeClass = this.activeClass;
        newContext.owner = this.owner;
        newContext.pkg = this.pkg;

        for(const [key, v] of this.symbols) {
            // variables and functions are the only symbols that can be cloned, since they are set in the scope by the parser
            if(v instanceof DeclaredVariable) {
                let v2 = v.clone(typeMap, newContext)
                newContext.addSymbol(v2);
            }
            else if (v instanceof DeclaredFunction) {
                let v2 = v.clone(typeMap, newContext);
                newContext.addSymbol(v2);
            }
        }

        return newContext;
        
    }
}
