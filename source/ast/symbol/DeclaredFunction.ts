/**
 * Filename: DeclaredFunction.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a declared function
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { buildGenericsMaps, inferFunctionHeader, signatureFromGenerics } from "../../typechecking/typeinference";
import { Expression } from "../expressions/Expression";
import { FunctionPrototype } from "../other/FunctionPrototype";
import { BlockStatement } from "../statements/BlockStatement";
import { FunctionDeclarationStatement } from "../statements/FunctionDeclarationStatement";
import { ReturnStatement } from "../statements/ReturnStatement";
import { DataType } from "../types/DataType";
import { Context } from "./Context";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";

export class DeclaredFunction extends Symbol {
    prototype: FunctionPrototype;
    expression: Expression | null;
    body: BlockStatement | null;

    context: Context;

    // cache of return statements, used for type checking
    returnStatements: {stmt: ReturnStatement, ctx: Context}[] = [];

    /**
     * Reference to the original declaration statement
     */
    declStatement: FunctionDeclarationStatement | null = null;


    /**
     * When a generic function is called, the generic arguments are used to instantiate a new function
     */
    concreteGenerics: {[key: string]: DeclaredFunction} = {};

    constructor(location: SymbolLocation, context: Context,  prototype: FunctionPrototype, expression: Expression | null, body: BlockStatement | null) {
        super(location, "function", prototype.name);
        this.prototype = prototype;
        this.expression = expression;
        this.body = body;
        this.context = context;

        // add the function to the context
        context.setOwner(this);

        // add the parameters to the context
        for (let i = 0; i < prototype.header.parameters.length; i++) {
            context.addSymbol(prototype.header.parameters[i]);
        }
    }

    infer(ctx: Context, typeArguments?: DataType[]): DeclaredFunction{
        if(this.prototype.generics.length > 0) {
            if(!typeArguments) {
                return this;
            }

            if(this.prototype.generics.length !== typeArguments.length) {
                throw ctx.parser.customError(`Function expects ${this.prototype.generics.length} generics parameters, but got ${typeArguments.length} instead`, this.location);
            }

            // check if we have a cached version of this function with the given type arguments
            let cached = this.concreteGenerics[signatureFromGenerics(typeArguments)];
            if(cached) {
                return cached;
            }

            // otherwise, create a new function with the given type arguments
            let genericTypeMap: {[key: string]: DataType} = buildGenericsMaps(ctx, this.prototype.generics, typeArguments);

            // clone the function with the new type map
            let newFn = this.clone(genericTypeMap);

            // update cache
            this.concreteGenerics[signatureFromGenerics(typeArguments)] = newFn;

            // infer new function
            newFn.infer(ctx);

            // refer to the original concrete generics
            newFn.concreteGenerics = this.concreteGenerics;

            return newFn;
        }

        inferFunctionHeader(ctx, 'function', this.returnStatements, this.prototype.header, this.body, this.expression);
        return this;
    }

    clone(typeMap: {[key: string]: DataType}): DeclaredFunction {
        let ctxClone = new Context(this.context.location, this.context.parser, this.context.getParent(), this.context.env);

        let newM = new DeclaredFunction(this.location, ctxClone, this.prototype.clone(typeMap), null, null);
        newM.declStatement = this.declStatement;
        newM.expression = this.expression;
        newM.body = this.body?.clone(typeMap, ctxClone) || null;

        if(newM.body) {
            newM.body.context.setOwner(newM);
            newM.body.context.overrideParent(newM.context);
        }

        return newM;
    }
}