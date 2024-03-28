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
import { LockType } from "../types/LockType";
import { PromiseType } from "../types/PromiseType";
import { FunctionArgument } from "../symbol/FunctionArgument";
import { ElementExpression } from "./ElementExpression";

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

    infer(ctx: Context, hint: DataType | null): DataType {
        this.setHint(hint);

        /**
         * Prior to inferring the LHS, we need to check if the LHS is a class method,
         * since direct method access is not allowed,
         * meaning we check if we have FnCall(MemberAccess(...), [...])
         * 
         * The same principle applies to:
         *  lock.request()
         *  lock.release()
         *  lock.withLock()
         *  promise.then()
         */

        if (this.lhs instanceof MemberAccessExpression) {
            let baseExpr = this.lhs.left;
            let baseExprType = this.lhs.left.infer(ctx, null);

            let memberExpr = this.lhs.right;

            if (baseExprType.is(ctx, ClassType)) {
                let returnType = this.inferClassMethod(ctx, baseExprType, memberExpr, hint);
                if (returnType) {
                    return returnType;
                }
            }
            else if (baseExprType.is(ctx, InterfaceType)) {
                return this.inferInterfaceMethod(ctx, baseExprType, memberExpr, hint);
            }
            else if (baseExprType.is(ctx, MetaType)) {
                let returnType = this.inferMetaType(ctx, baseExprType, memberExpr, hint);
                if (returnType) {
                    return returnType;
                }
            }
            else if (baseExprType.is(ctx, PromiseType)) {
                return this.inferPromise(ctx, baseExprType, memberExpr);
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

        if (lhsType.is(ctx, FunctionType)) {
            return this.inferFunction(ctx, lhsType);
        }
        // Callable instance
        else if (lhsType.is(ctx, ClassType) || lhsType.is(ctx, InterfaceType)) {
            return this.inferCallable(ctx, lhsType);
        }

        // FFI Method
        else if (lhsType.is(ctx, FFIMethodType)) {
            return this.inferFFIMethod(ctx, lhsType);
        }
        // Variant Constructor
        else if (lhsType.is(ctx, VariantConstructorType)) {
            // TODO: implement variant constructor
            throw new Error("Not implemented");
        }

        throw ctx.parser.customError(`Invalid function call`, this.location);
    }

    private inferCallable(ctx: Context, lhsType: DataType) {
        let lhsT = lhsType as ClassType | InterfaceType;
        let iscallable = isCallable(ctx, lhsT);

        if (!iscallable) {
            throw ctx.parser.customError(`Type ${lhsT.shortname()} is not callable`, this.location);
        }

        let method = getOperatorOverloadType(ctx, "__call__", lhsT, this.args.map(e => e.infer(ctx, null)));

        if (!method) {
            throw ctx.parser.customError(`Method __call__ not found in ${lhsT.shortname()}`, this.location);
        }

        // setup the hint for call arguments 
        for (let i = 0; i < this.args.length; i++) {
            this.args[i].setHint(method.header.parameters[i].type);
        }

        this.operatorOverloadState.setMethodRef(method);

        this.inferredType = matchCall(ctx, method, this.args);
        this.checkHint(ctx);
        return this.inferredType;
    }

    private inferFFIMethod(ctx: Context, lhsType: DataType) {

        let lhsT = lhsType.dereference() as FFIMethodType
        let interfaceMethod = lhsT.imethod;

        // check if the number of arguments is correct
        if (this.args.length !== interfaceMethod.header.parameters.length) {
            throw ctx.parser.customError(`Expected ${interfaceMethod.header.parameters.length} arguments, got ${this.args.length}`, this.location);
        }

        for (let i = 0; i < this.args.length; i++) {
            let paramType = interfaceMethod.header.parameters[i].type;
            let argType = this.args[i].infer(ctx, paramType);

            let res = matchDataTypes(ctx, paramType, argType);
            if (!res.success) {
                throw ctx.parser.customError(`Expected ${paramType.shortname()}, got ${argType.shortname()}: ${res.message}`, this.args[i].location);
            }

            // we also make sure that we respect the constraints of the parameter, i.e mutability
            if (!checkExpressionArgConst(this.args[i], argType, interfaceMethod.header.parameters[i], lhsType)) {
                throw ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
            }

        }
        this.inferredType = interfaceMethod.header.returnType;

        this.checkHint(ctx);
        this.isConstant = true;
        return this.inferredType;
    }

    private inferClassMethod(ctx: Context, baseExprType: DataType, memberExpr: ElementExpression, hint: DataType | null) {

        let baseClass = baseExprType.to(ctx, ClassType) as ClassType;

        /**
         * Check if it an attribute call, if it is not an attribute, it is a method call
         * if it is an attribute, we need to proceed with the regular logic
         */
        let isAttribute = baseClass.attributes.find(a => a.name === memberExpr.name);
        if (isAttribute === undefined) {

            /**
             * Since this is a function call, we expect the member to be a method,
             * we search for a method matching the signature creating using the given arguments and hint as return type (which might be null)
             */

            let inferredArgTypes = this.args.map(e => e.infer(ctx, null));
            let candidateMethods = baseClass.getMethodBySignature(ctx, memberExpr.name, inferredArgTypes, hint, memberExpr.typeArguments);
            if (candidateMethods.length === 0) {
                throw ctx.parser.customError(`Method ${memberExpr.name} not found in class ${baseClass.shortname()}`, this.location);
            }
            if (candidateMethods.length > 1) {
                throw ctx.parser.customError(`Ambiguous method ${memberExpr.name} in class ${baseClass.shortname()}`, this.location);
            }

            let method = candidateMethods[0];


            // since we might have a generic method, we need to re-infer the arguments of the call
            for (let i = 0; i < this.args.length; i++) {
                this.args[i].infer(ctx, method.header.parameters[i].type);
                if (!checkExpressionArgConst(this.args[i], method.header.parameters[i].type, method.header.parameters[i], method.header)) {
                    throw ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
                }
            }

            this.inferredType = method.header.returnType;
            this.checkHint(ctx);
            return this.inferredType;
        }
    }

    private inferFunction(ctx: Context, lhsType: DataType) {

        let lhsT = lhsType as FunctionType;
        // regular function call
        // check if the number of arguments is correct
        if (this.args.length !== lhsT.parameters.length) {
            throw ctx.parser.customError(`Expected ${lhsT.parameters.length} arguments, got ${this.args.length}`, this.location);
        }

        for (let i = 0; i < this.args.length; i++) {
            let paramType = lhsT.parameters[i].type;
            let argType = this.args[i].infer(ctx, paramType);

            let res = matchDataTypes(ctx, paramType, argType);
            if (!res.success) {
                throw ctx.parser.customError(`Expected ${paramType.shortname()}, got ${argType.shortname()}: ${res.message}`, this.args[i].location);
            }

            // we also make sure that we respect the constraints of the parameter, i.e mutability
            if (!checkExpressionArgConst(this.args[i], argType, lhsT.parameters[i], lhsType)) {
                throw ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
            }
        }

        this.inferredType = lhsT.returnType;
        this.checkHint(ctx);
        return this.inferredType;
    }

    private inferInterfaceMethod(ctx: Context, baseExprType: DataType, memberExpr: ElementExpression, hint: DataType | null) {
        let baseInterface = baseExprType.to(ctx, InterfaceType) as InterfaceType;

        /**
         * similar to classes, interfaces ccan have method overloads but no generics
         */
        let inferredArgTypes = this.args.map(e => e.infer(ctx, null));
        let candidateMethods = baseInterface.getMethodBySignature(ctx, memberExpr.name, inferredArgTypes, hint);
        if (candidateMethods.length === 0) {
            throw ctx.parser.customError(`Method ${memberExpr.name} not found in interface ${baseInterface.shortname()}`, this.location);
        }
        if (candidateMethods.length > 1) {
            throw ctx.parser.customError(`Ambiguous method ${memberExpr.name} in interface ${baseInterface.shortname()}`, this.location);
        }

        let method = candidateMethods[0];
        for (let i = 0; i < this.args.length; i++) {
            this.args[i].infer(ctx, method.header.parameters[i].type);
            if (!checkExpressionArgConst(this.args[i], method.header.parameters[i].type, method.header.parameters[i], method.header)) {
                throw ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
            }
        }

        this.inferredType = method.header.returnType;
        this.checkHint(ctx);
        return this.inferredType;
    }

    private inferMetaType(ctx: Context, baseExprType: DataType, memberExpr: ElementExpression, hint: DataType | null) {

        /**
         * If we have a metatype, we face the following 2 cases:
         * 1. Static method call from a class
         * 2. VariantConstructor call
         */

        // case 1: static method call
        if (baseExprType.is(ctx, MetaClassType)) {
            let metaClass = baseExprType.to(ctx, MetaClassType) as MetaClassType;
            let classType = metaClass.classType.to(ctx, ClassType) as ClassType;

            // find the method
            let inferredArgTypes = this.args.map(e => e.infer(ctx, null));
            let candidateMethods = classType.getMethodBySignature(ctx, memberExpr.name, inferredArgTypes, hint, memberExpr.typeArguments);

            if (candidateMethods.length === 0) {
                throw ctx.parser.customError(`Method ${memberExpr.name} not found in class ${classType.shortname()}`, this.location);
            }

            if (candidateMethods.length > 1) {
                throw ctx.parser.customError(`Ambiguous method ${memberExpr.name} in class ${classType.shortname()}`, this.location);
            }

            let method = candidateMethods[0];
            for (let i = 0; i < this.args.length; i++) {
                this.args[i].infer(ctx, method.header.parameters[i].type);
                if (!checkExpressionArgConst(this.args[i], method.header.parameters[i].type, method.header.parameters[i], method.header)) {
                    throw ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
                }
            }

            this.inferredType = method.header.returnType;
            this.checkHint(ctx);
            return this.inferredType;
        }

        // case 2: variant constructor
        else if (baseExprType.is(ctx, MetaVariantType)) {
            let variantConstructorMeta = this.lhs.infer(ctx, null);
            if (!variantConstructorMeta.is(ctx, MetaVariantConstructorType)) {
                throw "Unreachable";
            }

            let metaVariantConstructor = variantConstructorMeta.to(ctx, MetaVariantConstructorType) as MetaVariantConstructorType;
            let metaVariant = baseExprType.to(ctx, MetaVariantType) as MetaVariantType;
            let variantType = metaVariant.variantType.to(ctx, VariantType) as VariantType;

            if (metaVariantConstructor.typeArguments.length !== memberExpr.typeArguments.length) {
                throw ctx.parser.customError(`Expected ${metaVariantConstructor.typeArguments.length} type arguments, got ${memberExpr.typeArguments.length}`, this.location);
            }

            if (metaVariantConstructor.typeArguments.length > 0) {
                let map = buildGenericsMaps(ctx, metaVariantConstructor.genericParameters, memberExpr.typeArguments);
                variantType = variantType.clone(map);
            }

            let variantConstructor = variantType.constructors.find(c => c.name === memberExpr.name);

            if (variantConstructor === undefined) {
                throw ctx.parser.customError(`Constructor ${memberExpr.name} not found in variant ${variantType.shortname()}`, this.location);
            }

            // if we have generics, we need to clone the variant type
            //let map = buildGenericsMaps(ctx, method.generics, memberExpr.typeArguments);


            // make sure we have the right number of arguments
            if (this.args.length !== variantConstructor.parameters.length) {
                throw ctx.parser.customError(`Expected ${variantConstructor.parameters.length} arguments, got ${this.args.length}`, this.location);
            }

            // infer the arguments
            for (let i = 0; i < this.args.length; i++) {
                this.args[i].infer(ctx, variantConstructor.parameters[i].type);
            }

            // set the inferred type
            this.inferredType = variantConstructor;
            this.checkHint(ctx);
            return this.inferredType;
        }
        else {
            // return null so we can resume the regular inference
            return null;
        }
    }

    private inferPromise(ctx: Context, baseExprType: DataType, memberExpr: ElementExpression) {
        /**
         * Usage: 
         * let x: promise<U> = ...
         * x.then<U, V>(fn(data: U) -> V { .. }).then<V, W>(fn(data: V) -> W { .. }) ...
         */

        /**
         * When it comes .then<U, V> (..), the types are not necessarily present, hence we need to infer them
         */

        let promiseReturnType = (baseExprType.to(ctx, PromiseType) as PromiseType).returnType;

        let typesArgumentsPresent = false;
        let inputType: DataType | null = null;
        let outputType: DataType | null = null;

        if (memberExpr.typeArguments.length > 0) {
            typesArgumentsPresent = true;

            // make sure they are two
            if (memberExpr.typeArguments.length !== 2) {
                throw ctx.parser.customError(`Expected 2 type arguments, got ${memberExpr.typeArguments.length}`, memberExpr.location);
            }

            inputType = memberExpr.typeArguments[0];
            outputType = memberExpr.typeArguments[1];
        }

        // now we make sure this function call is a valid callback function
        if (this.args.length !== 1) {
            throw ctx.parser.customError(`Expected 1 argument, got ${this.args.length}`, this.location);
        }

        if (typesArgumentsPresent) {
            // now we expect our call back to be fn(x: inputType) -> outputType
            // outputType is the return type of the callback

            let callBackExpectedType = new FunctionType(this.location, [new FunctionArgument(this.location, "data", inputType!, false)], outputType!);
            // make sure the argument matches the callback
            let argType = this.args[0].infer(ctx, callBackExpectedType);
            let res = matchDataTypes(ctx, callBackExpectedType, argType);
            if (!res.success) {
                throw ctx.parser.customError(`Expected ${callBackExpectedType.shortname()}, got ${argType.shortname()}: ${res.message}`, this.args[0].location);
            }

            let fnType = argType.to(ctx, FunctionType) as FunctionType;

            // we also make sure that the argument to the callback function is that wrapped in a promise
            let res2 = matchDataTypes(ctx, promiseReturnType, fnType.parameters[0].type);
            if (!res2.success) {
                throw ctx.parser.customError(`Expected ${promiseReturnType.shortname()}, got ${argType.shortname()}: ${res2.message}`, this.args[0].location);
            }

            /**
             * Promise.then() does not necessarily return a promise, it returns the return type of the callback
             * to chain .then, each must be a promise
             */
            this.inferredType = outputType!;
        }
        else {
            // we infer the callback type
            // first we make sure the argument is a function
            let argType = this.args[0].infer(ctx, null);
            if (!argType.is(ctx, FunctionType)) {
                throw ctx.parser.customError(`Expected function, got ${argType.shortname()}`, this.args[0].location);
            }

            // make sure the function has one argument
            let funcType = argType as FunctionType;
            if (funcType.parameters.length !== 1) {
                throw ctx.parser.customError(`Expected 1 argument, got ${funcType.parameters.length}`, this.args[0].location);
            }

            // the callback argument must match the return type of the promise
            let res = matchDataTypes(ctx, promiseReturnType, funcType.parameters[0].type);
            if (!res.success) {
                throw ctx.parser.customError(`Expected ${promiseReturnType.shortname()}, got ${funcType.parameters[0].type.shortname()}: ${res.message}`, this.args[0].location);
            }

            this.inferredType = funcType.returnType;
        }

        this.checkHint(ctx);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): FunctionCallExpression {
        return new FunctionCallExpression(this.location, this.lhs.clone(typeMap, ctx), this.args.map(e => e.clone(typeMap, ctx)));
    }
}