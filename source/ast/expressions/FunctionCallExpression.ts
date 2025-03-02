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
import { Expression, InferenceMeta } from "./Expression";
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
import { ElementExpression } from "./ElementExpression";
import { CoroutineType } from "../types/CoroutineType";
import { InterfaceMethod } from "../other/InterfaceMethod";
import { DeclaredFunction } from "../symbol/DeclaredFunction";
import { UnaryExpression } from "./UnaryExpression";
import { NullableType } from "../types/NullableType";
import { MutateExpression } from "./MutateExpression";
import { VoidType } from "../types/VoidType";
import { GenericType } from "../types/GenericType";
import { BinaryExpression } from "./BinaryExpression";

export class FunctionCallExpression extends Expression {
    lhs: Expression;
    args: Expression[];

    // capture the state of the operator overload, if any
    // default is not overloaded
    operatorOverloadState: OperatorOverloadState = new OperatorOverloadState();

    // cache of the method in case of method call
    // applicable class methods and static class method
    _calledClassMethod: ClassMethod | null = null;

    _calledInterfaceMethod: InterfaceMethod | null = null;

    _calledFunction: DeclaredFunction | null = null;

    _isCoroutineCall: boolean = false;

    // set when we have a?.b()
    _isNullableCall: boolean = false;

    _calledNamespaceSymbol: Symbol | null = null;

    _calledFFIMethod: InterfaceMethod | null = null;

    constructor(location: SymbolLocation, lhs: Expression, args: Expression[]) {
        super(location, "function_call");
        this.lhs = lhs;
        this.args = args;
    }

    checkMutability(ctx: Context, header: FunctionType) {
        // we make sure that no constant expression is passed to a mut argument
        for (let i = 0; i < this.args.length; i++) {
            if (header.parameters[i].isMutable) {
                // we also make  sure that we respect the constraints of the parameter, i.e mutability
                if (!checkExpressionArgConst(this.args[i], this.args[i].inferredType!, header.parameters[i], header)) {
                    ctx.parser.customError(`Argument ${this.args[i].isConstant ? "const" : ""} ${i} is not assignable to parameter ${header.parameters[i].isMutable ? "mut " : ""}${header.parameters[i].name}, mutability missmatch`, this.args[i].location);
                }
            }
        }
    }

    infer(ctx: Context, hint: DataType | null, meta?: InferenceMeta): DataType {
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
        // first, infer the LHS

        let left = this.lhs;

        if (left instanceof MutateExpression) {
            left = left.expression;

            if (left instanceof UnaryExpression) {
                if (left.operator === "!!") {
                    left = left.expression;
                }
            }
        }

        if (left instanceof UnaryExpression) {
            if (left.operator === "!!") {
                left = left.expression;

                if (left instanceof MutateExpression) {
                    left = left.expression;
                }
            }
        }

        if (left instanceof MemberAccessExpression) {
            let baseExpr = left.left;
            this._isNullableCall = left.isNullable;

            let baseExprType = baseExpr.infer(ctx, null, meta);

            if(this._isNullableCall){
                /**
                 * We make sure the LHS of a?.b is of a nullable type
                 */

                if(!baseExprType.allowedNullable(ctx)){
                    ctx.parser.customError(`Cannot perform \`?.\` on non-nullable type ${baseExprType.getShortName()}.`, this.location);
                }
            }
            else {
                if(baseExprType.is(ctx, NullableType)){
                    ctx.parser.customError(`Cannot perform \`.\` on nullable type ${baseExprType.getShortName()}, maybe you want to use \`?.\` instead.`, this.location);
                }
            }

            let memberExpr = left.right;

            if (baseExprType.is(ctx, ClassType)) {
                let returnType = this.inferClassMethod(ctx, baseExprType, memberExpr, hint, meta);
                if (returnType) {
                    return returnType;
                }
            }
            else if (baseExprType.is(ctx, InterfaceType)) {
                return this.inferInterfaceMethod(ctx, baseExprType, memberExpr, hint, meta);
            }
            else if (baseExprType.is(ctx, MetaType)) {
                let returnType = this.inferMetaType(ctx, baseExprType, memberExpr, hint, meta);
                if (returnType) {
                    return returnType;
                }
            }

        }

        if ((left instanceof ElementExpression) && (left.typeArguments.length === 0) && (left.isGenericFunction(ctx))) {
            left.inferredArgumentsTypes = this.args.map(e => e.infer(ctx, null, meta));
        }
        else if ((left instanceof MemberAccessExpression) && (left.right.typeArguments.length === 0)) {
            left.right.inferredArgumentsTypes = this.args.map(e => e.infer(ctx, null, meta));
        }

        if (left instanceof ElementExpression) {
            left.numParams = this.args.length;
        }

        let lhsType: DataType;


        if (left instanceof ElementExpression) {
            lhsType = this.lhs.infer(ctx, null, {...meta,args: this.args});
        }
        else {
            lhsType = left.infer(ctx, null, {...meta,args: this.args});
        }

        if (lhsType.is(ctx, NullableType)) {
            ctx.parser.customError("Cannot call a possibly null value", this.location);
        }

        /**
         * Check if LHS is:
         * 1. A function
         * 2. Class or interface instance which is callable
         * 3. FFI Method
         * 4. Variant Constructor
         */

        if (lhsType.is(ctx, FunctionType)) {
            return this.inferFunction(ctx, lhsType, meta);
        }
        // Callable instance
        else if (lhsType.is(ctx, ClassType) || lhsType.is(ctx, InterfaceType)) {
            return this.inferCallable(ctx, lhsType, meta);
        }

        // FFI Method
        else if (lhsType.is(ctx, FFIMethodType)) {
            return this.inferFFIMethod(ctx, lhsType, meta);
        }
        // Variant Constructor
        else if (lhsType.is(ctx, VariantConstructorType)) {
            // We should not reach this point since this should be already caught
            ctx.parser.error("Unreachable");
        }
        else if (lhsType.is(ctx, CoroutineType)) {
            return this.inferCoroutine(ctx, lhsType, meta);
        }

        ctx.parser.customError(`Invalid function call`, this.location);
    }

    private inferCallable(ctx: Context, lhsType: DataType, meta?: InferenceMeta) {
        let lhsT = lhsType as ClassType | InterfaceType;
        let iscallable = isCallable(ctx, lhsT);

        if (!iscallable) {
            ctx.parser.customError(`Type ${lhsT.getShortName()} is not callable`, this.location);
        }

        let method = getOperatorOverloadType(ctx, "__call__", lhsT, this.args.map(e => e.infer(ctx, null, meta)));

        if (!method) {
            ctx.parser.customError(`Method __call__ not found in ${lhsT.getShortName()}`, this.location);
        }

        // setup the hint for call arguments
        for (let i = 0; i < this.args.length; i++) {
            this.args[i].setHint(method.header.parameters[i].type);
        }

        this.operatorOverloadState.setMethodRef(method);

        this.inferredType = matchCall(ctx, method, this.args);
        this.checkMutability(ctx, method.header);
        this.checkHint(ctx);
        return this.inferredType;
    }

    private inferFFIMethod(ctx: Context, lhsType: DataType, meta?: InferenceMeta) {
        lhsType.resolve(ctx);
        if(this._isNullableCall){
            ctx.parser.customError("Cannot call a FFI method with a nullable member access ?.", this.location)
        }

        let lhsT = lhsType.dereference() as FFIMethodType
        let interfaceMethod = lhsT.imethod;

        // check if the number of arguments is correct
        if (this.args.length !== interfaceMethod.header.parameters.length) {
            ctx.parser.customError(`Expected ${interfaceMethod.header.parameters.length} arguments, got ${this.args.length}`, this.location);
        }

        for (let i = 0; i < this.args.length; i++) {
            let paramType = interfaceMethod.header.parameters[i].type;
            let argType = this.args[i].infer(ctx, paramType, meta);

            let res = matchDataTypes(ctx, paramType, argType);
            if (!res.success) {
                ctx.parser.customError(`Expected ${paramType.getShortName()}, got ${argType.getShortName()}: ${res.message}`, this.args[i].location);
            }

            // we also make sure that we respect the constraints of the parameter, i.e mutability
            if (!checkExpressionArgConst(this.args[i], argType, interfaceMethod.header.parameters[i], lhsType)) {
                ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
            }

        }
        this._calledFFIMethod = interfaceMethod;
        this.inferredType = interfaceMethod.header.returnType;
        this.checkMutability(ctx, interfaceMethod.header);

        this.checkHint(ctx);
        return this.inferredType;
    }

    private inferClassMethod(ctx: Context, baseExprType: DataType, memberExpr: ElementExpression, hint: DataType | null, meta?: InferenceMeta) {

        let baseClass = baseExprType.to(ctx, ClassType) as ClassType;
        baseClass.resolve(ctx);

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


            // TODO:
            // check if we have only one method with the given name, then we infer arguments based on the method's parameters
            // else we use the regular logic

            let inferredArgTypes = this.args.map(e => e.infer(ctx, null, meta));
            let candidateMethods = baseClass.getMethodBySignature(ctx, memberExpr.name, inferredArgTypes, hint, memberExpr.typeArguments);
            if (candidateMethods.length === 0) {
                ctx.parser.customError(`Method ${memberExpr.name}(${inferredArgTypes.map(e => e.getShortName()).join(", ")}) ${hint?"-> "+hint.getShortName():""} not found in class ${baseExprType.getShortName()}`, this.location);
            }
            if (candidateMethods.length > 1) {
                ctx.parser.customError(`Ambiguous method ${memberExpr.name} in class ${baseExprType.getShortName()}`, this.location);
            }

            let method = candidateMethods[0];


            // since we might have a generic method, we need to re-infer the arguments of the call
            for (let i = 0; i < this.args.length; i++) {
                // we do not always use the hint, for cases like "hi" + ("world" - "!")
                //                                               would infer ("world" - "!") as a i64, hence inferring string literal as i64 which is wrong
                this.args[i].infer(ctx, method.header.parameters[i].type, meta);
                if (!checkExpressionArgConst(this.args[i], method.header.parameters[i].type, method.header.parameters[i], method.header)) {
                    ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
                }
            }


            // save the reference to the source method to be used in the code generator
            this._calledClassMethod = method._sourceMethod;
            this.checkMutability(ctx, method.header);

            // manually set the inferred type of the lhs, since
            // this.lhs.lhs was already inferred let baseExpr = this.lhs.left;
            // this is because we do not allow class methods to be used except in a function call context
            // meaning if only have x.print without (), it results in a property access, hence, failing
            this.lhs.inferredType = method.header;


            this.inferredType = method.header.returnType;
            this.checkHint(ctx);
            this.checkNullability(ctx, meta);
            return this.inferredType;
        }
        else {
            if(!isAttribute.type.allowedNullable(ctx) && this._isNullableCall){
                ctx.parser.customError(`The result of an expression following a nullable access ?. should always be a type that can be null or void.`, this.location)
            }
        }
    }

    private inferFunction(ctx: Context, lhsType: DataType, meta?: InferenceMeta) {
        let lhsT = lhsType as FunctionType;

        if (lhsT.isCoroutine) {
            ctx.parser.customError(`Cannot call coroutine directly`, this.location);
        }

        // regular function call
        // check if the number of arguments is correct
        if (this.args.length !== lhsT.parameters.length) {
            ctx.parser.customError(`Expected ${lhsT.parameters.length} arguments, got ${this.args.length}`, this.location);
        }

        for (let i = 0; i < this.args.length; i++) {
            let paramType = lhsT.parameters[i].type;
            let argType = this.args[i].infer(ctx, paramType, meta);

            let res = matchDataTypes(ctx, paramType, argType);
            if (!res.success) {
                ctx.parser.customError(`Expected ${paramType.getShortName()}, got ${argType.getShortName()}: ${res.message}`, this.args[i].location);
            }
        }

        this.inferredType = lhsT.returnType;
        this.checkMutability(ctx, lhsT);
        this.checkNullability(ctx, meta);
        this.checkHint(ctx);
        return this.inferredType;
    }

    private inferInterfaceMethod(ctx: Context, baseExprType: DataType, memberExpr: ElementExpression, hint: DataType | null, meta?: InferenceMeta) {
        let baseInterface = baseExprType.to(ctx, InterfaceType) as InterfaceType;

        /**
         * similar to classes, interfaces ccan have method overloads but no generics
         */
        let inferredArgTypes = this.args.map(e => e.infer(ctx, null, meta));
        // TODO:
        // check if we have only one method with the given name, then we infer arguments based on the method's parameters
        // else we use the regular logic


        let candidateMethods = baseInterface.getMethodBySignature(ctx, memberExpr.name, inferredArgTypes, hint);
        if (candidateMethods.length === 0) {
            ctx.parser.customError(`Method ${memberExpr.name} not found in interface ${baseExprType.getShortName()}`, this.location);
        }
        if (candidateMethods.length > 1) {
            ctx.parser.customError(`Ambiguous method ${memberExpr.name} in interface ${baseExprType.getShortName()}`, this.location);
        }

        let method = candidateMethods[0];
        for (let i = 0; i < this.args.length; i++) {
            let type = method.header.parameters[i].type;
            type.resolve(ctx);
            this.args[i].infer(ctx, type, meta);
            if (!checkExpressionArgConst(this.args[i], type, method.header.parameters[i], method.header)) {
                ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
            }
        }

        // save the reference to the source method to be used in the code generator
        this._calledInterfaceMethod = method;
        this.checkMutability(ctx, method.header);

        // manually set the inferred type of the lhs, since
        // this.lhs.lhs was already inferred let baseExpr = this.lhs.left;
        // this is because we do not allow class methods to be used except in a function call context
        // meaning if only have x.print without (), it results in a property access, hence, failing
        this.lhs.inferredType = method.header;

        this.inferredType = method.header.returnType;
        this.checkHint(ctx);
        this.checkNullability(ctx, meta);
        return this.inferredType;
    }

    private inferMetaType(ctx: Context, baseExprType: DataType, memberExpr: ElementExpression, hint: DataType | null, meta?: InferenceMeta) {
        /**
         * If we have a metatype, we face the following 2 cases:
         * 1. Static method call from a class
         * 2. VariantConstructor call
         */

        // case 1: static method call
        if (baseExprType.is(ctx, MetaClassType)) {
            if(this._isNullableCall){
                ctx.parser.customError("Cannot call a static method with a nullable member access ?.", this.location)
            }

            let metaClass = baseExprType.to(ctx, MetaClassType) as MetaClassType;
            let classType = metaClass.classType.to(ctx, ClassType) as ClassType;

            // find the method
            let inferredArgTypes = this.args.map(e => e.infer(ctx, null, meta));
            let candidateMethods = classType.getMethodBySignature(ctx, memberExpr.name, inferredArgTypes, hint, memberExpr.typeArguments);

            if (candidateMethods.length === 0) {
                ctx.parser.customError(`Method ${memberExpr.name} not found in class ${classType.getShortName()}`, this.location);
            }

            if (candidateMethods.length > 1) {
                ctx.parser.customError(`Ambiguous method ${memberExpr.name} in class ${classType.getShortName()}`, this.location);
            }

            let method = candidateMethods[0];
            for (let i = 0; i < this.args.length; i++) {
                this.args[i].infer(ctx, method.header.parameters[i].type, meta);
                if (!checkExpressionArgConst(this.args[i], method.header.parameters[i].type, method.header.parameters[i], method.header)) {
                    ctx.parser.customError(`Argument ${i} is not assignable to parameter ${i}, mutability missmatch`, this.args[i].location);
                }
            }

            // make sure the method is static
            if(!method.isStatic){
                ctx.parser.customError(`Method ${memberExpr.name} is not static`, this.location);
            }

            // save the reference to the source method to be used in the code generator
            this._calledClassMethod = method._sourceMethod;

            // manually set the inferred type of the lhs, since
            // this.lhs.lhs was already inferred let baseExpr = this.lhs.left;
            // this is because we do not allow class methods to be used except in a function call context
            // meaning if only have x.print without (), it results in a property access, hence, failing
            this.lhs.inferredType = method.header;

            this.inferredType = method.header.returnType;
            this.checkHint(ctx);
            this.checkNullability(ctx, meta);
            return this.inferredType;
        }

        // case 2: variant constructor
        else if (baseExprType.is(ctx, MetaVariantType)) {
            if(this._isNullableCall){
                ctx.parser.customError("Cannot call a variant constructor with a nullable member access ?.", this.location)
            }

            let metaType = this.lhs.infer(ctx, null, meta);
            if (!metaType.is(ctx, MetaVariantConstructorType)) {
                throw "Unreachable";
            }

            let variantConstructorMeta: MetaVariantConstructorType = metaType.to(ctx, MetaVariantConstructorType) as MetaVariantConstructorType;


            let metaVariantConstructor = variantConstructorMeta.to(ctx, MetaVariantConstructorType) as MetaVariantConstructorType;
            let metaVariant = baseExprType.to(ctx, MetaVariantType) as MetaVariantType;
            let variantType = metaVariant.variantType.to(ctx, VariantType) as VariantType;

            let variantConstructor: VariantConstructorType | null = null;

            if (metaVariantConstructor.typeArguments.length !== memberExpr.typeArguments.length) {
                ctx.parser.customError(`Expected ${metaVariantConstructor.typeArguments.length} type arguments, got ${memberExpr.typeArguments.length}`, this.location);
            }

            if (metaVariantConstructor.typeArguments.length > 0) {
                let map = buildGenericsMaps(ctx, metaVariantConstructor.genericParameters, memberExpr.typeArguments);
                variantType = variantType.clone(map);
                variantConstructor = variantType.constructors.find(c => c.name === memberExpr.name)!;
            }
            else if (variantConstructorMeta.genericParameters.length > 0){
                // we have to infer the arguments based on the constructor's parameters
                // infer from usage
                // but we cannot infer all generics present in the parent 

                /**
                 * We have VariantType<A, B> = variant { Ok(A), Err(B) }
                 * 
                 * Then we have VariantType.Err("Cool"), we can only infer the type of B, thus we return
                 * only a variant constructor with the type VariantType.B<String> without reference to the parent
                 * inherits Err(B) ID btw
                 */

                let genericParams: { [key: string]: GenericType } = {};
                for (let i = 0; i < variantConstructorMeta.genericParameters.length; i++) {
                    genericParams[variantConstructorMeta.genericParameters[i].name] = variantConstructorMeta.genericParameters[i];
                }

                variantConstructor = variantType.constructors.find(c => c.name === memberExpr.name)!;
                
                let res: { [key: string]: DataType } = {};


                /**
                 * to handle cases like: 
                 * let r: ServerResponse<u64, u64> = ServerResponse.Success(10)
                 *                                                          ^^ will be inferred as u8, if we don't use the hint
                 * 
                 * if we do not have a hint, we infer the arguments normally (keep it as u8 for example)
                 * 
                 */
                let hasHint = false;
                let paramsHint: DataType[] = [];
                if(hint != null){
                    // we make sure that the hint is either a variant constructor or a variant type
                    if(!hint.is(ctx, VariantType) && !hint.is(ctx, VariantConstructorType)){
                        ctx.parser.customError(`Expected a variant constructor or a variant type, got ${hint.getShortName()}`, this.location);
                    }

                    if(hint.is(ctx, VariantConstructorType)){
                        let variantConstructor = hint.to(ctx, VariantConstructorType) as VariantConstructorType;
                        paramsHint = variantConstructor.parameters.map(p => p.type);
                        hasHint = true;
                    }

                    else if(hint.is(ctx, VariantType)){
                        // find the constructor that matches the variant type
                        let variantType = hint.to(ctx, VariantType) as VariantType;
                        variantConstructor = variantType.constructors.find(c => c.name === memberExpr.name)!;
                        hasHint = true;
                        paramsHint = variantConstructor.parameters.map(p => p.type);
                    }
                }

                for(let i = 0; i < this.args.length; i++){
                    variantConstructor.parameters[i].type.getGenericParametersRecursive(ctx, this.args[i].infer(ctx, hasHint ? paramsHint[i] : null, meta), genericParams, res);
                }

                //variantConstructor.getGenericParametersRecursive(ctx, variantConstructorMeta.variantConstructorType, genericParams, res);
                variantConstructor = variantConstructor.clone(res);
            }

            else {
                variantType.resolve(ctx);

                variantConstructor = variantType.constructors.find(c => c.name === memberExpr.name)!;
                if (variantConstructor == undefined) {
                    ctx.parser.customError(`Constructor ${memberExpr.name} not found in variant ${variantType.getShortName()}`, this.location);
                }
            }
            // if we have generics, we need to clone the variant type
            //let map = buildGenericsMaps(ctx, method.generics, memberExpr.typeArguments);
            
            variantConstructor.resolve(ctx);

            // make sure we have the right number of arguments
            if (this.args.length !== variantConstructor!.parameters.length) {
                ctx.parser.customError(`Expected ${variantConstructor!.parameters.length} arguments, got ${this.args.length}`, this.location);
            }

            // infer the arguments
            for (let i = 0; i < this.args.length; i++) {
                this.args[i].infer(ctx, variantConstructor!.parameters[i].type, meta);
            }

            // set the inferred type
            this.inferredType = variantConstructor;
            this.checkHint(ctx);
            this.checkNullability(ctx, meta);
            return this.inferredType;
        }
        else {
            // return null so we can resume the regular inference
            return null;
        }
    }

    inferCoroutine(ctx: Context, lhsType: DataType, meta?: InferenceMeta): DataType {
        this._isCoroutineCall = true;
        let coroutineType = lhsType.to(ctx, CoroutineType) as CoroutineType;

        // make sure we have all required arguments
        if (this.args.length !== coroutineType.fnType.parameters.length) {
            ctx.parser.customError(`Expected ${coroutineType.fnType.parameters.length} arguments, got ${this.args.length}`, this.location);
        }

        // infer the arguments
        for (let i = 0; i < this.args.length; i++) {
            this.args[i].infer(ctx, coroutineType.fnType.parameters[i].type, meta);
        }

        // set the inferred type
        this.inferredType = coroutineType.fnType.returnType;
        this.checkMutability(ctx, coroutineType.fnType);
        this.checkHint(ctx);
        this.checkNullability(ctx, meta);
        return this.inferredType;
    }

    checkNullability(ctx: Context, meta?: InferenceMeta){
        if(this._isNullableCall && !meta?.isWithinNullishCoalescing){
            if(!this.inferredType?.allowedNullable(ctx) && !this.inferredType?.is(ctx, VoidType)) {
                ctx.parser.customError(`The result of an expression following a nullable access ?. should always be a type that can be null or void.`, this.location)
            }
        }


        // if are withing a nullish coalescing operator, we do not need to wrap the type in a nullable type
        // in case it is not nullable (say a basic type), because ?? will alwasy have a fallback expression
        // same logic as MemberAccessExpression.checkNullability()
        if(!this.inferredType?.is(ctx, NullableType) && !meta?.isWithinNullishCoalescing && this._isNullableCall){
            this.inferredType = new NullableType(this.location, this.inferredType!);
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): FunctionCallExpression {
        return new FunctionCallExpression(this.location, this.lhs.clone(typeMap, ctx), this.args.map(e => e.clone(typeMap, ctx)));
    }
}
