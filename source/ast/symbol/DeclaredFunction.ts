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

import { FunctionCodegenProps } from "../../codegenerator/FunctionCodegenProps";
import { FunctionInferenceCache } from "../../typechecking/FunctionInference";
import { buildGenericsMaps, inferFunctionHeader, signatureFromGenerics } from "../../typechecking/TypeInference";
import { Expression } from "../expressions/Expression";
import { FunctionPrototype } from "../other/FunctionPrototype";
import { BlockStatement } from "../statements/BlockStatement";
import { FunctionDeclarationStatement } from "../statements/FunctionDeclarationStatement";
import { ReturnStatement } from "../statements/ReturnStatement";
import { DataType } from "../types/DataType";
import { GenericType } from "../types/GenericType";
import { Context } from "./Context";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";


export class DeclaredFunction extends Symbol {
    prototype: FunctionPrototype;
    expression: Expression | null;
    body: BlockStatement | null;

    context: Context;

    // flag to check if the function was inferred, to avoid multiple inferences
    wasInferred: boolean = false;

    // cache of return statements, used for type checking
    returnStatements: { stmt: ReturnStatement, ctx: Context }[] = [];

    /**
     * Reference to the original declaration statement
     */
    declStatement: FunctionDeclarationStatement | null = null;


    /**
     * When a generic function is called, the generic arguments are used to instantiate a new function
     */
    concreteGenerics: Map<string, DeclaredFunction> = new Map();
    
    /**
     * Code gen properties
     */
    codeGenProps: FunctionCodegenProps


    constructor(location: SymbolLocation, context: Context, prototype: FunctionPrototype, expression: Expression | null, body: BlockStatement | null) {
        super(location, "function", prototype.name);
        this.prototype = prototype;
        this.expression = expression;
        this.body = body;
        this.context = context;

        this.codeGenProps = new FunctionCodegenProps(prototype.header);
        
        // add the function to the context
        context.setOwner(this);

        // add the parameters to the context
        for (let i = 0; i < prototype.header.parameters.length; i++) {
            context.addSymbol(prototype.header.parameters[i]);
            this.codeGenProps.registerArgSymbol(prototype.header.parameters[i]);
        }
    }

    /**
     * Used to check for recursive functions.
     * Generates a unique hash for the function
     */
    hash() {
        return this.prototype.name+'@'+this.location.file+':'+this.location.pos+'-'+this.prototype.generics.map(g => g.name).join('-');
    }

    infer(ctx: Context, typeArguments?: DataType[], parametersTypes?: DataType[]): DeclaredFunction {
        let beingInferred = FunctionInferenceCache.has(this);
        
        /**
         * parameter types will always be passed when inferring a function,
         * no matter if it is generics or not. Hence if we are re-evaluating the same function,
         * and it is concrete, we can return it directly.
         * 
         * We only re-infer when the function is generic and we have no type arguments
         */
        if(beingInferred && (typeArguments?.length === 0) && (this.prototype.generics.length === 0)/* && (parametersTypes?.length === 0)*/) {
            return this;
        }

        FunctionInferenceCache.push(this);
        if (this.prototype.generics.length > 0) {
            if (!typeArguments || ((parametersTypes?.length || 0) > 0)) {

                // presume no arguments, in case a function has no parameter that uses its generics
                if(!parametersTypes) {
                    return this;
                }

                // infer from usage
                let methodGenerics: { [key: string]: GenericType } = {};
                for (let i = 0; i < this.prototype.generics.length; i++) {
                    methodGenerics[this.prototype.generics[i].name] = this.prototype.generics[i];
                }


                /**
                 * If we have a generic method, we need to extract the type map from the parameters and/or the return type
                 */
                let map: { [key: string]: DataType } = {};
                for (let i = 0; i < parametersTypes.length; i++) {
                    let p = this.prototype.header.parameters[i];
                    p.type.getGenericParametersRecursive(this.context, parametersTypes[i], methodGenerics, map);
                }

                let newFn = this.clone(map, this.context.getParent()!);

                // set the generics to empty so we can properly infer its body and header by recalling this function
                newFn.prototype.generics = [];


                /**
                 * First we need to create an ordered, type arguments list, as declared in the method
                 */
                let typeArgs: DataType[] = [];

                for (const generic of this.prototype.generics) {
                    if (map[generic.name] === undefined) {
                        throw ctx.parser.customError(`Required generic type ${generic.name} not found in type map`, this.location);
                    }

                    typeArgs.push(map[generic.name]);
                }

                let typeArgSignature = signatureFromGenerics(typeArgs);

                // set the uid of the function
                newFn.uid = this.uid+'<'+typeArgSignature+'>';

                // update cache
                this.concreteGenerics.set(typeArgSignature, newFn);

                // infer new function
                newFn.infer(newFn.context);

                // refer to the original concrete generics
                newFn.concreteGenerics = this.concreteGenerics;

                FunctionInferenceCache.pop(this);
                return newFn;
            }

            if (this.prototype.generics.length !== typeArguments.length) {
                throw ctx.parser.customError(`Function expects ${this.prototype.generics.length} generics parameters, but got ${typeArguments.length} instead`, this.location);
            }

            // check if we have a cached version of this function with the given type arguments
            let cached = this.concreteGenerics.get(signatureFromGenerics(typeArguments));
            if (cached) {
                return cached;
            }

            // otherwise, create a new function with the given type arguments
            let genericTypeMap: { [key: string]: DataType } = buildGenericsMaps(ctx, this.prototype.generics, typeArguments);

            // clone the function with the new type map
            let newFn = this.clone(genericTypeMap, this.context.getParent()!);
            newFn.uid = this.uid+'<'+signatureFromGenerics(typeArguments)+'>';

            // set the generics to empty so we can properly infer its body and header by recalling this function
            newFn.prototype.generics = [];

            // update cache
            this.concreteGenerics.set(signatureFromGenerics(typeArguments), newFn);

            // infer new function
            newFn.infer(newFn.context);

            // refer to the original concrete generics
            newFn.concreteGenerics = this.concreteGenerics;

            FunctionInferenceCache.pop(this);
            return newFn;
        }
        else {
            if(this.wasInferred) {
                return this;
            }
        }

        inferFunctionHeader(this.context, 'function', this.returnStatements, this.prototype.header, this.body, this.expression);
        ctx.registerToGlobalContext(this);
        this.codeGenProps.reportUnusedSymbols(ctx, this.prototype.header);
        FunctionInferenceCache.pop(this);
        this.wasInferred = true;
        return this;
    }


    clone(typeMap: { [key: string]: DataType }, ctx: Context): DeclaredFunction {
        let newContext = this.context.clone(typeMap, ctx);
        let newM = new DeclaredFunction(this.location, newContext, this.prototype.clone(typeMap), null, null);
        newM.declStatement = new FunctionDeclarationStatement(this.location, newM);
        newM.expression = this.expression?.clone(typeMap, newContext) || null;
        newM.body = this.body?.clone(typeMap, newContext) || null;

        if (newM.body) {
            newM.body.context.setOwner(newM);
            newM.body.context.overrideParent(newM.context);
        }

        FunctionInferenceCache.pop(this);
        return newM;
    }

    isGeneric(): boolean {
        return this.prototype.generics.length > 0;
    }

    getConcreteMethod(signature: string): DeclaredFunction {
        let concrete = this.concreteGenerics.get(signature);
        if(!concrete) {
            throw new Error(`No concrete method found for signature ${signature}`);
        }
        return concrete;
    }
}