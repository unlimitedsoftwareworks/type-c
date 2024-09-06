/**
 * Filename: FunctionCodegenProps.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Codegen properties for a declared function/class method or a lambda function
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { LambdaExpression } from "../ast/expressions/LambdaExpression";
import { Context } from "../ast/symbol/Context";
import { DeclaredFunction } from "../ast/symbol/DeclaredFunction";
import { DeclaredVariable } from "../ast/symbol/DeclaredVariable";
import { FunctionArgument } from "../ast/symbol/FunctionArgument";
import { Symbol } from "../ast/symbol/Symbol";
import { SymbolLocation } from "../ast/symbol/SymbolLocation";
import { ClassType } from "../ast/types/ClassType";
import { FunctionType } from "../ast/types/FunctionType";
import { getDataTypeByteSize } from "./utils";

export class FunctionStackSymbol {
    sym: Symbol;
    byteSize: number;
    offset: number;

    constructor(sym: Symbol, byteSize: number, offset: number) {
        this.sym = sym;
        this.byteSize = byteSize;
        this.offset = offset;
    }
}

/**
 * This class represents the code generation properties for a declared function
 */
export class FunctionCodegenProps {

    // local symbols
    localSymbols: Map<string, Symbol> = new Map();

    // arguments
    argSymbols: Map<string, Symbol> = new Map();

    // registered arg symbols
    usedArgSymbols: Map<string, Symbol> = new Map();

    // upvalues (for closures)
    upvalues: Map<string, Symbol> = new Map();

    /**
     * if the function is a class method, "this" will need to be passed as an argument
     */
    _this: FunctionArgument | null = null;


    // symbols as defined in the stack, filled during code gen
    stackSymbols: Map<string, FunctionStackSymbol> = new Map();
    localsByteSize: number = 0;
    argsByteSize: number = 0;
    totalByteSize: number = 0;

    constructor() {
        // nothing todo here yet
    }

    /**
     * Makes sure that the symbol has a UID
     * @param sym 
     */
    assertSymbolUID(sym: Symbol) {
        if(sym.uid === ""){
            throw new Error("Symbol does not have a UID");
        }
    }

    /**
     * API Called by the analyzer
     */

    registerLocalSymbol(sym: Symbol) {
        this.assertSymbolUID(sym);
        this.localSymbols.set(sym.uid, sym);
    }

    registerArgSymbol(sym: Symbol) {
        this.assertSymbolUID(sym);
        this.argSymbols.set(sym.uid, sym);
    }

    registerUpvalue(sym: Symbol) {
        this.assertSymbolUID(sym);
        this.upvalues.set(sym.uid, sym);
    }

    markArgSymbolAsUsed(sym: Symbol) {
        this.assertSymbolUID(sym);
        this.usedArgSymbols.set(sym.uid, sym);
    }

    /**
     * After a function has been inferred, it is possible that some symbols are not used,
     * which means that they are not present in the codegen properties, hence this method
     * is used to report unused symbols
     */
    reportUnusedSymbols(ctx: Context, header: FunctionType) {
        // check for unused symbols
        for(const sym of header.parameters){
            if(!this.usedArgSymbols.has(sym.uid)){
                ctx.parser.customWarning(`Unused argument ${sym.name}`, sym.location);
            }
        }
    }

    assignThis(cl: ClassType, location: SymbolLocation, parentContext: Context) {
        this._this = new FunctionArgument(location, "$this"+parentContext.uuid, cl, true);
        this._this.uid = "$this";
    }

    /**
     * APIs called by the Code Generator
     */

    /**
     * Computes the stack layout for the function, fills the stackSymbols map
     */
    computeStack() {
        this.localsByteSize = 0;
        this.argsByteSize = 0;

        // check if _this is needed
        if(this._this) {
            this.argsByteSize += getDataTypeByteSize(this._this.type);
            this.stackSymbols.set(this._this.uid, new FunctionStackSymbol(this._this, getDataTypeByteSize(this._this.type), this.argsByteSize));
        }

        for(const [_, sym] of this.argSymbols){
            if(sym instanceof FunctionArgument){
                const byteSize = getDataTypeByteSize(sym.type);
                this.stackSymbols.set(sym.uid, new FunctionStackSymbol(sym, byteSize, this.argsByteSize));
                this.argsByteSize += byteSize;
            }
            else {
                throw new Error("Invalid symbol type");
            }
        }
        
        for (const [_, sym] of this.localSymbols) {
            if(sym instanceof DeclaredFunction || sym instanceof LambdaExpression){
                // declared functions and lambdas are registered to the global context
                continue;
            }
            else if (sym instanceof DeclaredVariable) {
                // supposed to be unreachable
                if (sym.annotation == null) {
                    throw new Error("Declared variable does not have an annotation, it should have been inferred!");
                }

                const byteSize = getDataTypeByteSize(sym.annotation!);
                this.stackSymbols.set(sym.uid, new FunctionStackSymbol(sym, byteSize, this.localsByteSize));
                this.localsByteSize += byteSize;
            }
            else {
                throw new Error("Invalid symbol type");
            }
        }

        this.totalByteSize = this.argsByteSize + this.localsByteSize;
    }

    isSymOnStack(sym: Symbol): boolean {
        return this.stackSymbols.has(sym.uid);
    }


}