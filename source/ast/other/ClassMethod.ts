/**
 * Filename: ClassMethod.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     A class method is a method defined in a class
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Expression } from "../expressions/Expression";
import { BlockStatement } from "../statements/BlockStatement";
import { ReturnStatement } from "../statements/ReturnStatement";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { InterfaceMethod } from "./InterfaceMethod";
import { inferFunctionHeader, signatureFromGenerics } from "../../typechecking/TypeInference";
import { DataType } from "../types/DataType";


export class ClassMethod {
    location: SymbolLocation;

    // interface method
    imethod: InterfaceMethod;

    // if the method has an expression
    expression: Expression | null = null;
    // or a statement block
    body: BlockStatement | null = null;

    context: Context;

    /**
     * List of return statements in the method, used for type checking
     */
    returnStatements: {stmt: ReturnStatement, ctx: Context}[] = [];

    /**
     * List of concrete generic methods, i.e when a generic method is called with concrete types, they are
     * cached here.
     */
    private _concreteGenerics: {[key: string]: ClassMethod} = {};

    private _wasInferred: boolean = false;

    constructor(location: SymbolLocation, context: Context, imethod: InterfaceMethod, body: BlockStatement | null, expression: Expression | null) {
        this.location = location;
        this.imethod = imethod;
        this.context = context;
        this.body = body;
        this.expression = expression;


        /**
         * Mark this method as the owner of the context
         */
        context.setOwner(this);

        /**
         * Add arguments to the method's context
         */
        for(const arg of imethod.header.parameters) {
            this.context.addSymbol(arg);
        }

        /**
         * We add generics to scope too
         */
        for(const arg of imethod.generics) {
            //this.context.addSymbol(arg);
        }

    }

    shortname(): string {
        return this.imethod.shortname();
    }

    serialize(): string {
        return `@method{${this.imethod.serialize()}}`
    }

    infer(ctx: Context) {
        if(this._wasInferred) return;
        
        /** removed in favor of location base type checking for classes
        if(this.imethod.header.returnType instanceof UnsetType) {
            throw ctx.parser.customError(`Method ${this.imethod.name} has no return type`, this.location);
        }
         */

        if(this.imethod.isGeneric()) {
            // we do not infer generic methods, we wait until they are called to perform type checking
            // so we call infer on the cloned concrete method.
            return ;
        }

        inferFunctionHeader(this.context, "method", this.returnStatements, this.imethod.header, this.body, this.expression);   
    }

    getConcreteGenerics(){
        return this._concreteGenerics;
    }

    clone(typeMap: { [key: string]: DataType; }, removeGenerics: boolean = false): ClassMethod {
        let newCtx = this.context.clone(typeMap, this.context);
        let newProto = this.imethod.clone(typeMap);

        if(removeGenerics === true) {
            newProto.generics = [];
        }

        let fn = new ClassMethod(this.location, newCtx, newProto, null, null);
        // we delay the cloning of the body and expression because
        // return statements in body requires the owner in the 
        // context to refer to the method, which is not set until after
        // the fn has been constucted and then the body cloned
        fn.expression = this.expression?.clone(typeMap, newCtx) || null;
        fn.body = this.body?.clone(typeMap, newCtx) || null;

        if(fn.body !== null) {
            fn.body.context.overrideParent(fn.context);
        }
        return fn;
    }

    /**
     * Clones the method if no concrete method with the given type arguments exists, otherwise
     * returns the existing concrete method
     * @param ctx
     * @param typeMap 
     * @param typeArguments 
     */
    generateConcreteMethod(ctx: Context, typeMap: { [key: string]: DataType}, typeArguments: DataType[]): ClassMethod {
        let sig = signatureFromGenerics(typeArguments);
        if(this._concreteGenerics[sig] !== undefined) {
            return this._concreteGenerics[sig];
        }

        // else we have to construct it
        if(this.imethod.generics.length !== typeArguments.length) {
            throw new Error(`Method ${this.imethod.name} expects ${this.imethod.generics.length} type arguments, got ${typeArguments.length}`);
        }

        for(let arg of this.imethod.generics) {
            arg.constraint.types.forEach(t => {t.resolve(ctx)});

            if(typeMap[arg.name] === undefined) {
                throw ctx.parser.customError(`Generic type ${arg.name} not found in type map`, this.location);
            }

            let res = arg.constraint.checkType(ctx, typeMap[arg.name]);
            if(res === false) {
                throw ctx.parser.customError(`Type ${typeMap[arg.name].shortname()} does not satisfy constraint set on generic type ${arg.name}`, this.location);
            }
        }

        // all conditions are met, we can now clone the method
        let newMethod = this.clone(typeMap, true);
        this._concreteGenerics[sig] = newMethod;
        newMethod._concreteGenerics = this._concreteGenerics;
        newMethod.infer(newMethod.context);

        return newMethod;
    }
}