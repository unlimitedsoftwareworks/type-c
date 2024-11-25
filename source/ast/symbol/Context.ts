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

import { GlobalContext } from "../../codegenerator/GlobalContext";
import { TypeC } from "../../compiler";
import { Parser } from "../../parser/Parser";
import { BasePackage } from "../BasePackage";
import { DoExpression } from "../expressions/DoExpression";
import { LambdaExpression } from "../expressions/LambdaExpression";
import { ClassMethod } from "../other/ClassMethod";
import { ImplementationMethod } from "../other/ImplementationMethod";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { ImplementationType } from "../types/ImplementationType";
import { DeclaredFunction } from "./DeclaredFunction";
import { DeclaredNamespace } from "./DeclaredNamespace";
import { DeclaredType } from "./DeclaredType";
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
    withinImplementation: boolean;
    withinFunction: boolean;
    withinLoop: boolean;
    loopContext: boolean;
    withinDoExpression: boolean;
};

type ContextOwner =
    | BasePackage
    | LambdaExpression
    | ClassMethod
    | ImplementationMethod
    | DeclaredFunction
    | DoExpression
    | DeclaredNamespace
    | null;

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
     * Children of this Context, this is used when the compiler is used in IDE mode
     */
    private _children: Context[] = [];

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
     * If the context is within an implementation, we need this when we are resolving `this` for example
     */
    private activeImplementation: ImplementationType | null = null;

    /**
     * Global context pointer,
     * only exists in the highest level context and assigned from the base package
     */
    globalContext: GlobalContext | null = null;

    /**
     * A unique identifier for this context
     */
    static contextCount = 0;
    uuid = "ctx_" + Context.contextCount++; // Math.random().toString(36).substring(7);

    //static _contextMap = new Map<string, Context>();
    //contextMap = Context._contextMap;

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
        loopContext: false, // indicates if this context is a loop context, used for break/continue.
        // only set to true in the context that belongs to a loop and not the subsequent children contexts
        withinDoExpression: false,
        withinImplementation: false,
    };

    /**
     * The location of this symbol table.
     */
    location: SymbolLocation;

    /**
     * End location of this context, used for intellisense
     */
    endLocation: SymbolLocation | null = null;

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

        if (parent === null) {
            // default env
        } else {
            // inherit env
            this.env.withinClass = parent.env.withinClass || false;
            this.env.withinFunction = parent.env.withinFunction || false;
            this.env.withinLoop = parent.env.withinLoop || false;
            this.env.loopContext = parent.env.loopContext || false;
            this.env.withinDoExpression = parent.env.withinDoExpression || false;
            this.env.withinImplementation = parent.env.withinImplementation || false;
        }

        // override with new env
        this.env.withinClass = env.withinClass || this.env.withinClass;
        this.env.withinFunction = env.withinFunction || this.env.withinFunction;
        this.env.withinLoop = env.withinLoop || this.env.withinLoop;
        this.env.loopContext = env.loopContext || this.env.loopContext;
        this.env.withinDoExpression = env.withinDoExpression || this.env.withinDoExpression;
        this.env.withinImplementation = env.withinImplementation || this.env.withinImplementation;
        //Context._contextMap.set(this.uuid, this);

        //if (parser.mode == "intellisense") {
        // sadly its now needed T.T
        if (parent) {
            parent._children.push(this);
        }
        //}
    }

    setOwner(owner: ContextOwner) {
        this.owner = owner;
    }

    getOwner(){
        return this.owner;
    }

    addSymbol(symbol: Symbol) {
        let v = this.lookupLocal(symbol.name);
        if (v !== null) {
            throw this.parser.customError(
                `Symbol ${symbol.name} already declared in this scope`,
                symbol.location,
            );
        }

        let v2 = this.lookup(symbol.name);
        if (v2 !== null) {
            this.parser.customWarning(
                `Symbol ${symbol.name} defined in ${symbol.location.toString()} shadows symbol defined in ${v2.location.toString()}`,
                symbol.location,
            );
        }

        if (symbol.uid.length !== 0) {
            throw new Error("Symbol already has a UID");
        }

        symbol.uid = this.uuid + "_" + symbol.name + "_" + this.symbolCount++;

        this.symbols.set(symbol.name, symbol);
        symbol.parentContext = this;

        /**
         * Functions need to be registered to the global context,
         * meaning in code gen, when we define a function, we need to
         * generate code for it in the global context, and call it
         * using its global address.
         * TODO: figureout what to do with closures
         */
        let registeredGlobal = false;
        if (
            symbol instanceof DeclaredFunction ||
            symbol instanceof LambdaExpression ||
            symbol instanceof DeclaredType
        ) {
            this.registerToGlobalContext(symbol);
            registeredGlobal = true;
        }

        // check if we are at root and need to register to global context
        // but not repeat previous instructions as well
        if (
            this.globalContext !== null &&
            !(
                symbol instanceof DeclaredFunction ||
                symbol instanceof LambdaExpression
            )
            && !registeredGlobal
        ) {
            this.registerToGlobalContext(symbol);
        }
    }

    // adds a symbol to the current context, but does not set the parent context
    // i.e does not take ownership of the symbol
    addExternalSymbol(symbol: Symbol, name: string) {
        symbol.external = true;
        let old = this.lookup(name);
        if (old !== null) {
            throw this.parser.customError(
                `Symbol ${name} already declared/imported in this scope`,
                old.location,
            );
        }

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
    getCurrentPackage() {
        // replace path separators with dots
        let p = this.pkg.replace(/\\/g, ".").replace(/\//g, ".");
        let stdlibPath = TypeC.TCCompiler.stdlibDir
            .replace(/\\/g, ".")
            .replace(/\//g, ".");
        p = p.replace(stdlibPath, "~");
        // remove the extension
        p = p.replace(".tc", "");
        // remove type-c-lib

        return p;
    }

    findParentFunction():
        | DeclaredFunction
        | ImplementationMethod
        | LambdaExpression
        | ClassMethod
        | null {
        if (this.owner instanceof DeclaredFunction) {
            return this.owner;
        }
        if (this.owner instanceof ImplementationMethod) {
            return this.owner;
        }
        if (this.owner instanceof ClassMethod) {
            return this.owner;
        }
        if (this.owner instanceof LambdaExpression) {
            return this.owner;
        } else if (this.parent) {
            return this.parent.findParentFunction();
        } else {
            return null;
        }
    }

    findParentDoExpression(): DoExpression | null {
        if (this.owner instanceof DoExpression) {
            return this.owner;
        }
        if (this.parent) {
            return this.parent.findParentDoExpression();
        }
        return null;
    }

    /**
     * Sometimes, we could be within a lambda function within a class method, and we need to retrieve the actual method,
     * hence we use this method
     */
    findParentClassMethod(): ClassMethod | null {
        if (this.owner instanceof ClassMethod) {
            return this.owner;
        }
        if (this.parent) {
            return this.parent.findParentClassMethod();
        }
        return null;
    }

    lookup(name: string): Symbol | null {
        let symbol = this.symbols.get(name);
        if (symbol !== undefined) {
            return symbol;
        } else if (this.parent !== null) {
            return this.parent.lookup(name);
        } else {
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
    lookupScope(name: string): { sym: Symbol; scope: SymbolScope } | null {
        let symbol = this.symbols.get(name);

        if (symbol != undefined) {
            /**
             * A global symbol can be within a block, thus having a parent context,
             * but it cannot be within a function/lambda or class.
             */
            if (this.parent === null) {
                // we are in the global scope
                // register the global variable

                if (!symbol.external) {
                    this.registerToGlobalContext(symbol);
                }

                return { sym: symbol, scope: "global" };
            } else {
                // register the local variable
                let owner = this.findParentFunction();
                if (owner !== null) {
                    if (
                        symbol instanceof DeclaredVariable ||
                        symbol instanceof VariablePattern
                    ) {
                        // a variable pattern is a local variable too
                        owner.codeGenProps.registerLocalSymbol(symbol);
                    } else if (symbol instanceof FunctionArgument) {
                        // we do not need to register arguments, since they are already registered
                        // when the method/function is created
                        // instead we mark it as used
                        owner.codeGenProps.markArgSymbolAsUsed(symbol);
                    }
                }

                return { sym: symbol, scope: "local" };
            }
        } else {
            if (this.parent === null) {
                return null;
            } else {
                let parentScope = this.parent.lookupScope(name);

                if (parentScope === null) {
                    return null;
                }

                /**
                 * If the symbol comes from another function, then it is an upvalue
                 * this.parent?.parent makes sure the symbol doesn't come from a global
                 * scope and mistakably be registered as an upvalue
                 */

                if (
                    this.parent?.parent == null ||
                    parentScope.scope === "global"
                ) {
                    return parentScope;
                } else {
                    let symParentFn =
                        parentScope.sym.parentContext?.findParentFunction();
                    let owner = this.findParentFunction();

                    // if we went from one function to another, we need to register the upvalue
                    if (symParentFn !== owner && symParentFn !== null) {
                        owner!.codeGenProps.registerUpvalue(parentScope.sym);
                        return { sym: parentScope.sym, scope: "upvalue" };
                    } else {
                        return parentScope;
                    }
                }
            }
        }
    }

    lookupLocal(name: string): Symbol | null {
        let symbol = this.symbols.get(name);
        if (symbol !== undefined) {
            return symbol;
        } else {
            return null;
        }
    }

    setActiveClass(cls: ClassType | null) {
        this.activeClass = cls;
    }

    getActiveClass(): ClassType | null {
        if (this.activeClass) {
            return this.activeClass;
        }
        if (this.parent) {
            return this.parent.getActiveClass();
        } else {
            return null;
        }
    }

    setActiveImplementation(impl: ImplementationType | null) {
        this.activeImplementation = impl;
    }

    getActiveImplementation(): ImplementationType | null {
        if (this.activeImplementation) {
            return this.activeImplementation;
        }
        if (this.parent) {
            return this.parent.getActiveImplementation();
        }
        return null;
    }

    getActiveMethod(): ClassMethod | null {
        if (this.owner instanceof ClassMethod) {
            return this.owner;
        }
        if (this.parent) {
            return this.parent.getActiveMethod();
        }
        return null;
    }

    getActiveImplementationMethod(): ImplementationMethod | null {
        if (this.owner instanceof ImplementationMethod) {
            return this.owner;
        }
        if (this.parent) {
            return this.parent.getActiveImplementationMethod();
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
     * Clones current context, clones the active symbols too,
     * requires a parent scope, so we do not need to clone parents recursively
     */
    clone(
        typeMap: { [key: string]: DataType },
        parent: Context | null,
    ): Context {
        let newContext = new Context(
            this.location,
            this.parser,
            parent || this.parent,
            this.env,
        );
        newContext.activeClass = this.activeClass;
        newContext.owner = this.owner;
        newContext.pkg = this.pkg;

        newContext.endLocation = this.endLocation;

        return newContext;
    }

    /**
     * Adds a symbol to the global context.
     * The global context contains everything that needs to be generated on a higher level,
     * such as functions, classes, etc. For example, when a function is declared within another function
     * the inner function is not available in the global context, but for the code generator, it is.
     * It is treated as a regular function (or closure, if applicable) and has a global address etc.
     * @param sym
     */
    registerToGlobalContext(sym: Symbol) {
        if (this.globalContext === null) {
            if (this.parent === null) {
                throw new Error("Global context not set");
            }
            this.parent.registerToGlobalContext(sym);
        } else {
            if (!sym.uid || sym.uid.length === 0) {
                throw new Error("Symbol has no UID");
            }

            this.globalContext.registerSymbol(sym);
        }
    }

    getInnerLoopContext(): Context | null {
        if (this.env.loopContext) {
            return this;
        }
        if (this.parent) {
            return this.parent.getInnerLoopContext();
        }
        return null;
    }

    // code generation
    generateEndOfContextLabel(): string {
        return "end_ctx_" + this.uuid;
    }

    registerThisAsUpvalue(
        thisUp: Symbol,
    ): ClassMethod | LambdaExpression | DeclaredFunction | ImplementationMethod | null {
        if (this.owner instanceof ClassMethod) {
            return this.owner;
        } else {
            if (this.parent === null) {
                return null;
            } else {
                let thisOwner = this.parent.registerThisAsUpvalue(thisUp);
                /**
                 * If the symbol comes from another function, then it is an upvalue
                 * this.parent?.parent makes sure the symbol doesn't come from a global
                 * scope and mistakably be registered as an upvalue
                 */

                if (thisOwner == null) {
                    return null;
                } else {
                    let symParentFn = thisOwner;
                    let owner = this.findParentFunction();

                    // if we went from one function to another, we need to register the upvalue
                    if (symParentFn !== owner && symParentFn !== null) {
                        owner!.codeGenProps.registerUpvalue(thisUp);
                        // we return the owner to be used in the expression, so we do not it assign it again
                        return owner;
                    }

                    return thisOwner;
                }
            }
        }
    }

    getBasePackage(): BasePackage {
        if(this.owner instanceof BasePackage){
            return this.owner;
        }

        if(this.parent === null){
            throw new Error("Base package not found, this should be unreachable");
        }
        return this.parent!.getBasePackage();
    }

    withinNamespace(uid: string): boolean {
        if(this.owner instanceof DeclaredNamespace){
            return this.owner.uid === uid;
        }
        if(this.parent){
            return this.parent.withinNamespace(uid);
        }
        return false;
    }

    // used by ImplementationMethod to remove the implementation env
    // and set the class env instead
    removeImplementationEnv() {
        this.env.withinClass = true;
        this.env.withinImplementation = false;
        for (const child of this._children) {
            child.removeImplementationEnv();
        }
    }
    /**
     * Intellisense API
     */
    getSymbols(): Symbol[] {
        return Array.from(this.symbols.values());
    }

    getChildContexts(): Context[] {
        return this._children;
    }

    getEndLocation(): SymbolLocation | null {
        if (!this.endLocation && this.parent) {
            return this.parent.getEndLocation();
        }
        return this.endLocation;
    }
}
