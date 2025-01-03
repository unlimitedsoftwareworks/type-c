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
import { inferFunctionReturnFromHeader, signatureFromGenerics } from "../../typechecking/TypeInference";
import { DataType } from "../types/DataType";
import { FunctionCodegenProps } from "../../codegenerator/FunctionCodegenProps";
import { Symbol } from "../symbol/Symbol";


export class ClassMethod extends Symbol {

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
    private _concreteGenerics: Map<string, ClassMethod> = new Map();

    private _wasInferred: boolean = false;

    indexInClass: number = -1;


    /**
     * Code gen properties
     */
    codeGenProps: FunctionCodegenProps

    isCoroutineCallable: boolean = false;

    // if the method is external, i.e from an implementation type
    isExternal: boolean = false;

    // if the method is an override, i.e overrides an external method
    isOverride: boolean = false;

    constructor(location: SymbolLocation, context: Context, imethod: InterfaceMethod, body: BlockStatement | null, expression: Expression | null) {
        super(location, "class_method", imethod.name);

        this.imethod = imethod;
        this.context = context;
        this.body = body;
        this.expression = expression;

        this.codeGenProps = new FunctionCodegenProps(imethod.header);
        /**
         * Mark this method as the owner of the context
         */
        context.setOwner(this);

        /**
         * Add arguments to the method's context
         */
        for(const arg of imethod.header.parameters) {
            this.context.addSymbol(arg);
            this.codeGenProps.registerArgSymbol(arg);
        }

        /**
         * We add generics to scope too
         */
        for(const arg of imethod.generics) {
            // OR DO WE?? TAN TAN DAAAAAAA!
            //this.context.addSymbol(arg);
        }

        /**
         * While being a symbol, a class method is actually not added to any Context, hence its ID is not set
         */
        this.uid = 'm-'+InterfaceMethod.getMethodUID(imethod);
        this.imethod._sourceMethod = this;
    }

    shortname(): string {
        return this.imethod.getShortName();
    }

    serialize(unpack: boolean = false): string {
        return `@method{${this.imethod.serialize(unpack)}}`
    }

    infer(ctx: Context) {
        //if(this._wasInferred) return;
        
        /** removed in favor of location base type checking for classes
        if(this.imethod.header.returnType instanceof UnsetType) {
            ctx.parser.customError(`Method ${this.imethod.name} has no return type`, this.location);
        }
         */

        if(this.imethod.isGeneric()) {
            // we do not infer generic methods, we wait until they are called to perform type checking
            // so we call infer on the cloned concrete method.
            return ;
        }

        inferFunctionReturnFromHeader(this.context, "method", this.returnStatements, this.imethod.header, this.body, this.expression);   
        this.codeGenProps.reportUnusedSymbols(ctx, this.imethod.header);
        this._wasInferred = true
    }

    getConcreteGenerics(): Map<string, ClassMethod> {
        return this._concreteGenerics;
    }

    clone(typeMap: { [key: string]: DataType; }, removeGenerics: boolean = false): ClassMethod {
        let newCtx = this.context.clone(typeMap, this.context.getParent());
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

        fn.isExternal = this.isExternal;
        fn.isOverride = this.isOverride;
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
        if(this._concreteGenerics.has(sig)) {
            return this._concreteGenerics.get(sig) as ClassMethod;
        }

        // else we have to construct it
        if(this.imethod.generics.length !== typeArguments.length) {
            throw new Error(`Method ${this.imethod.name} expects ${this.imethod.generics.length} type arguments, got ${typeArguments.length}`);
        }

        for(let arg of this.imethod.generics) {
            arg.constraint.types.forEach(t => {t.resolve(ctx)});

            if(typeMap[arg.name] === undefined) {
                ctx.parser.customError(`Generic type ${arg.name} not found in type map`, this.location);
            }

            let res = arg.constraint.checkType(ctx, typeMap[arg.name]);
            if(res === false) {
                ctx.parser.customError(`Type ${typeMap[arg.name].getShortName()} does not satisfy constraint set on generic type ${arg.name}`, this.location);
            }
        }

        // all conditions are met, we can now clone the method
        let newMethod = this.clone(typeMap, true);
        this._concreteGenerics.set(sig, newMethod);
        newMethod._concreteGenerics = this._concreteGenerics;
        newMethod.uid = this.uid+'<'+sig+'>';
        newMethod.infer(newMethod.context);

        return newMethod;
    }

    needsInfer() {
        return !this._wasInferred;
    }

    isConstructor() {
        return this.imethod.name === "init";
    }

    getDetails(): string {
        return this.imethod.getDetails();
    }

    getDescription(): string {
        return this.imethod.getShortName();
    }

    // returns the description without the method name
    getHeadlessDescription(): string {
        return this.imethod.getHeadlessDescription();
    }
}
