/**
 * Filename: ImplementationMethod.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     A method is a method defined in an implementation
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Expression } from "../expressions/Expression";
import { BlockStatement } from "../statements/BlockStatement";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { InterfaceMethod } from "./InterfaceMethod";
import { DataType } from "../types/DataType";
import { ClassMethod } from "./ClassMethod";
import { MemberAccessExpression } from "../expressions/MemberAccessExpression";
import { ClassAttribute } from "./ClassAttribute";
import { Symbol } from "../symbol/Symbol";
import { ReturnStatement } from "../statements/ReturnStatement";
import { FunctionCodegenProps } from "../../codegenerator/FunctionCodegenProps";


export class ImplementationMethod extends Symbol {

    // to replace with the actual RHS once the class implementation args are known
    thisMemberAccessExpression: MemberAccessExpression[] = [];


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
    
    codeGenProps: FunctionCodegenProps

    
    constructor(location: SymbolLocation, context: Context, imethod: InterfaceMethod, body: BlockStatement | null, expression: Expression | null) {
        super(location, "implementation_method", imethod.name);

        this.imethod = imethod;
        this.context = context;
        this.body = body;
        this.expression = expression;
        this.codeGenProps = new FunctionCodegenProps(imethod.header);
    }

    shortname(): string {
        return "impl{"+this.imethod.shortname()+"}";
    }

    serialize(unpack: boolean = false): string {
        return `@impl{method{${this.imethod.serialize(unpack)}}}`
    }

    infer(ctx: Context) {
        //super.infer(ctx);
    }


    cloneImpl(typeMap: { [key: string]: DataType; }, removeGenerics: boolean = false, newCtx: Context): ImplementationMethod {
        let newProto = this.imethod.clone(typeMap);

        if(removeGenerics === true) {
            newProto.generics = [];
        }

        let fn = new ImplementationMethod(this.location, newCtx, newProto, null, null);
        newCtx.setOwner(fn);

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


    clone(typeMap: { [key: string]: DataType; }, removeGenerics: boolean = false): ImplementationMethod {
        
        let newCtx = this.context.clone(typeMap, this.context.getParent());
        let newProto = this.imethod.clone(typeMap);

        if(removeGenerics === true) {
            newProto.generics = [];
        }

        let fn = new ImplementationMethod(this.location, newCtx, newProto, null, null);
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

    toClassMethod(classAttrMap: { [key: string]: ClassAttribute }) {
        // first clone the implementation method so we can safely override the member access expressions

        let emptyMap: { [key: string]: DataType } = {};

        // create method ctx and capture return statements
        let newCtx = this.context.clone(emptyMap, this.context.getParent());
        newCtx.env.withinImplementation = true;
        newCtx.env.withinFunction = true;

        let newMethod = this.cloneImpl(emptyMap, false, newCtx);

        // now we replace the this expression with the class attribute
        for (const expr of newMethod.thisMemberAccessExpression) {
            let attr = classAttrMap[expr.right.name];
            if(attr === undefined) {
                // could be a method call, we resume
                continue;
            }

            

            // replace the RHS with the attribute name
            expr.right.name = attr.name;
        }



        newCtx.env.withinImplementation = false;
        newCtx.env.withinFunction = true;
        newCtx.env.withinClass = true;
        newCtx.removeImplementationEnv();
        let fn = new ClassMethod(this.location, newCtx, newMethod.imethod.clone(emptyMap), null, null);
        // we delay the cloning of the body and expression because
        // return statements in body requires the owner in the 
        // context to refer to the method, which is not set until after
        // the fn has been constucted and then the body cloned
        fn.expression = newMethod.expression;
        fn.body = newMethod.body;
        fn.returnStatements = newMethod.returnStatements;

        if(fn.body !== null) {
            fn.body.context.overrideParent(fn.context);
        }
        newCtx.setOwner(fn);
        return fn;
    }

}
