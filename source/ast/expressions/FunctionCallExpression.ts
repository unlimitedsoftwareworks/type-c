/**
 * Filename: FunctionCallExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a function call
 *      f(x, y, z)
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { SymbolLocation } from "../symbol/SymbolLocation";
import { OperatorOverloadState } from "../other/OperatorOverloadState";
import { Expression } from "./Expression";
import { DataType } from "../types/DataType";
import { Context } from "../symbol/Context";
import { MemberAccessExpression } from "./MemberAccessExpression";
import { FunctionType } from "../types/FunctionType";
import { checkExpressionArgConst, matchDataTypes } from "../../typechecking/TypeChecking";
import { ClassType } from "../types/ClassType";
import { getOperatorOverloadType, isCallable, matchCall } from "../../typechecking/OperatorOverload";
import { InterfaceType } from "../types/InterfaceType";
import { FFIMethodType } from "../types/FFIMethodType";
import { VariantConstructorType } from "../types/VariantConstructorType";
import { buildGenericsMaps } from "../../typechecking/TypeInference";
import { MetaClassType, MetaType, MetaVariantConstructorType, MetaVariantType } from "../types/MetaTypes";
import { VariantType } from "../types/VariantType";
import { ClassMethod } from "../other/ClassMethod";

export class FunctionCallExpression extends Expression {
    lhs: Expression;
    args: Expression[];

    // capture the state of the operator overload, if any
    // default is not overloaded
    operatorOverloadState: OperatorOverloadState = new OperatorOverloadState();

    constructor(location: SymbolLocation, lhs: Expression, args: Expression[]) {
        super(location, "function_call");
        this.lhs = lhs;
        this.args = args;
    }

    infer(ctx: Context, hint: DataType | null){
        this.setHint(hint);

        /**
         * Prior to inferring the LHS, we need to check if the LHS is a class method,
         * since direct method access is not allowed,
         * meaning we check if we have FnCall(MemberAccess(...), [...])
         */

        if(this.lhs instanceof MemberAccessExpression) {
            let baseExpr = this.lhs.left;
            let baseExprType = this.lhs.left.infer(ctx, null);

            let memberExpr = this.lhs.right;

            if(baseExprType.is(ctx, ClassType)) {
                let baseClass = baseExprType.to(ctx, ClassType) as ClassType;

                /**
                 * Check if it an attribute call, if it is not an attribute, it is a method call
                 * if it is an attribute, we need to proceed with the regular logic
                 */
                let isAttribute = baseClass.attributes.find(a => a.name === memberExpr.name);
                if(isAttribute === undefined) {

                    /**
                     * Since this is a function call, we expect the member to be a method,
                     * we search for a method matching the signature creating using the given arguments and hint as return type (which might be null)
                     */

                    let inferredArgTypes = this.args.map(e => e.infer(ctx, null));
                    let candidateMethods = baseClass.getMethodBySignature(ctx, memberExpr.name, inferredArgTypes, hint);
                    if(candidateMethods.length === 0) {
                        throw ctx.parser.customError(`Method ${memberExpr.name} not found in class ${baseClass.shortname()}`, this.location);
                    }
                    if(candidateMethods.length > 1) {
                        throw ctx.parser.customError(`Ambiguous method ${memberExpr.name} in class ${baseClass.shortname()}`, this.location);
                    }

                    let method = candidateMethods[0];

                    /**
                     * if we have a generic method, we need to infer the generic types
                     */
                    if(method.generics.length !== memberExpr.typeArguments.length) {
                        throw ctx.parser.customError(`Expected ${method.generics.length} type arguments, got ${memberExpr.typeArguments.length}`, this.location);
                    }

                    if(method.generics.length > 0) {
                        let map = buildGenericsMaps(ctx, method.generics, memberExpr.typeArguments);
                        let m: ClassMethod | null = null;
                        try {
                            m = baseClass.getGenericMethodByName(ctx, memberExpr.name);
                        }
                        catch(e) {
                            throw ctx.parser.customError(`Method ${memberExpr.name} does not support generics`, this.location);
                        }
                        if(m === null) {
                            throw "unexpected null";
                        }

                        let newM = m.generateConcreteMethod(ctx, map, memberExpr.typeArguments);
                        method = newM.imethod;
                    }

                    // since we might have a generic method, we need to re-infer the arguments of the call
                    for(let i = 0; i < this.args.length; i++){
                        this.args[i].infer(ctx, method.header.parameters[i].type);
                        if(!checkExpressionArgConst(this.args[i], method.header.parameters[i].type, method.header.parameters[i], method.header)) {
                            throw ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
                        }
                    }

                    this.inferredType = method.header.returnType;
                    this.checkHint(ctx);
                    return this.inferredType;
                }
            }
            else if(baseExprType.is(ctx, InterfaceType)) {
                let baseInterface = baseExprType.to(ctx, InterfaceType) as InterfaceType;

                /**
                 * similar to classes, interfaces ccan have method overloads but no generics
                 */
                let inferredArgTypes = this.args.map(e => e.infer(ctx, null));
                let candidateMethods = baseInterface.getMethodBySignature(ctx, memberExpr.name, inferredArgTypes, hint);
                if(candidateMethods.length === 0) {
                    throw ctx.parser.customError(`Method ${memberExpr.name} not found in interface ${baseInterface.shortname()}`, this.location);
                }
                if(candidateMethods.length > 1) {
                    throw ctx.parser.customError(`Ambiguous method ${memberExpr.name} in interface ${baseInterface.shortname()}`, this.location);
                }

                let method = candidateMethods[0];
                for(let i = 0; i < this.args.length; i++){
                    this.args[i].infer(ctx, method.header.parameters[i].type);
                    if(!checkExpressionArgConst(this.args[i], method.header.parameters[i].type, method.header.parameters[i], method.header)) {
                        throw ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
                    }
                }

                this.inferredType = method.header.returnType;
                this.checkHint(ctx);
                return this.inferredType;
            }
            else if (baseExprType.is(ctx, MetaType)) {
                /**
                 * If we have a metatype, we face the following 2 cases:
                 * 1. Static method call from a class
                 * 2. VariantConstructor call
                 */

                // case 1: static method call
                if(baseExprType.is(ctx, MetaClassType)) {
                    let metaClass = baseExprType.to(ctx, MetaClassType) as MetaClassType;
                    let classType = metaClass.classType.to(ctx, ClassType) as ClassType;

                    // find the method
                    let inferredArgTypes = this.args.map(e => e.infer(ctx, null));
                    let candidateMethods = classType.getMethodBySignature(ctx, memberExpr.name, inferredArgTypes, hint);

                    if(candidateMethods.length === 0) {
                        throw ctx.parser.customError(`Method ${memberExpr.name} not found in class ${classType.shortname()}`, this.location);
                    }

                    if(candidateMethods.length > 1) {
                        throw ctx.parser.customError(`Ambiguous method ${memberExpr.name} in class ${classType.shortname()}`, this.location);
                    }

                    let method = candidateMethods[0];
                    for(let i = 0; i < this.args.length; i++){
                        this.args[i].infer(ctx, method.header.parameters[i].type);
                        if(!checkExpressionArgConst(this.args[i], method.header.parameters[i].type, method.header.parameters[i], method.header)) {
                            throw ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
                        }
                    }

                    this.inferredType = method.header.returnType;
                    this.checkHint(ctx);
                    return this.inferredType;
                }

                // case 2: variant constructor
                else if(baseExprType.is(ctx, MetaVariantType)) {
                    let variantConstructorMeta = this.lhs.infer(ctx, null);
                    if(!variantConstructorMeta.is(ctx, MetaVariantConstructorType)){
                        throw "Unreachable";
                    }

                    let metaVariantConstructor = variantConstructorMeta.to(ctx, MetaVariantConstructorType) as MetaVariantConstructorType;
                    let metaVariant = baseExprType.to(ctx, MetaVariantType) as MetaVariantType;
                    let variantType = metaVariant.variantType.to(ctx, VariantType) as VariantType;

                    if(metaVariantConstructor.typeArguments.length !== memberExpr.typeArguments.length) {
                        throw ctx.parser.customError(`Expected ${metaVariantConstructor.typeArguments.length} type arguments, got ${memberExpr.typeArguments.length}`, this.location);
                    }

                    if(metaVariantConstructor.typeArguments.length > 0) {
                        let map = buildGenericsMaps(ctx, metaVariantConstructor.genericParameters, memberExpr.typeArguments);
                        variantType = variantType.clone(map);
                    }

                    let variantConstructor = variantType.constructors.find(c => c.name === memberExpr.name);

                    if(variantConstructor === undefined) {
                        throw ctx.parser.customError(`Constructor ${memberExpr.name} not found in variant ${variantType.shortname()}`, this.location);
                    }

                    // if we have generics, we need to clone the variant type
                    //let map = buildGenericsMaps(ctx, method.generics, memberExpr.typeArguments);
                    

                    // make sure we have the right number of arguments
                    if(this.args.length !== variantConstructor.parameters.length) {
                        throw ctx.parser.customError(`Expected ${variantConstructor.parameters.length} arguments, got ${this.args.length}`, this.location);
                    }

                    // infer the arguments
                    for(let i = 0; i < this.args.length; i++){
                        this.args[i].infer(ctx, variantConstructor.parameters[i].type);
                    }

                    // set the inferred type
                    this.inferredType = variantConstructor;
                    this.checkHint(ctx);
                    return this.inferredType;
                }
                
            }
        }

        let lhsType = this.lhs.infer(ctx, null);

        /**
         * Check if LHS is:
         * 1. A function
         * 2. Class or interface instance which is callable
         * 3. FFI Method 
         * 4. Variant Constructor
         */

        if(lhsType.is(ctx, FunctionType)) {
            let lhsT = lhsType as FunctionType;
            // regular function call
            // check if the number of arguments is correct
            if(this.args.length !== lhsT.parameters.length){
                throw ctx.parser.customError(`Expected ${lhsT.parameters.length} arguments, got ${this.args.length}`, this.location);
            }

            for(let i = 0; i < this.args.length; i++){
                let paramType = lhsT.parameters[i].type;
                let argType = this.args[i].infer(ctx, paramType);

                let res = matchDataTypes(ctx, paramType, argType);
                if(!res.success) {
                    throw ctx.parser.customError(`Expected ${paramType.shortname()}, got ${argType.shortname()}: ${res.message}`, this.args[i].location);
                }

                // we also make sure that we respect the constraints of the parameter, i.e mutability
                if(!checkExpressionArgConst(this.args[i], argType, lhsT.parameters[i], lhsType)) {
                    throw ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
                }
            }

            this.inferredType = lhsT.returnType;
            this.checkHint(ctx);
            return this.inferredType;
        }
        // Callable instance
        else if (lhsType.is(ctx, ClassType) || lhsType.is(ctx, InterfaceType)) {
            let lhsT = lhsType as ClassType | InterfaceType;
            let iscallable = isCallable(ctx, lhsT);

            if(!iscallable) {
                throw ctx.parser.customError(`Type ${lhsT.shortname()} is not callable`, this.location);
            }

            let method = getOperatorOverloadType(ctx, "__call__", lhsT, this.args.map(e => e.infer(ctx, null)));

            if(!method) {
                throw ctx.parser.customError(`Method __call__ not found in ${lhsT.shortname()}`, this.location);
            }

            // setup the hint for call arguments 
            for(let i = 0; i < this.args.length; i++){
                this.args[i].setHint(method.header.parameters[i].type);
            }

            this.operatorOverloadState.setMethodRef(method);

            this.inferredType = matchCall(ctx, method, this.args);
            this.checkHint(ctx);
            return this.inferredType;
        }

        // FFI Method
        else if (lhsType.is(ctx, FFIMethodType)) {
            let lhsT = lhsType.dereference() as FFIMethodType
            let interfaceMethod = lhsT.imethod;

            // check if the number of arguments is correct
            if(this.args.length !== interfaceMethod.header.parameters.length){
                throw ctx.parser.customError(`Expected ${interfaceMethod.header.parameters.length} arguments, got ${this.args.length}`, this.location);
            }

            for(let i = 0; i < this.args.length; i++){
                let paramType = interfaceMethod.header.parameters[i].type;
                let argType = this.args[i].infer(ctx, paramType);

                let res = matchDataTypes(ctx, paramType, argType);
                if(!res.success) {
                    throw ctx.parser.customError(`Expected ${paramType.shortname()}, got ${argType.shortname()}: ${res.message}`, this.args[i].location);
                }

                // we also make sure that we respect the constraints of the parameter, i.e mutability
                if(!checkExpressionArgConst(this.args[i], argType, interfaceMethod.header.parameters[i], lhsType)) {
                    throw ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
                }

            }
            this.inferredType = interfaceMethod.header.returnType;

            this.checkHint(ctx);
            this.isConstant = true;
            return this.inferredType;
        }
        // Variant Constructor
        else if (lhsType.is(ctx, VariantConstructorType)) {
            // TODO: implement variant constructor
            throw new Error("Not implemented");
        }

        throw ctx.parser.customError(`Invalid function call`, this.location);
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): FunctionCallExpression {
        return new FunctionCallExpression(this.location, this.lhs.clone(typeMap, ctx), this.args.map(e => e.clone(typeMap, ctx)));
    }
}