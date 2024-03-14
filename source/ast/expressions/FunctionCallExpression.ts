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
import { checkExpressionArgConst, matchDataTypes } from "../../typechecking/typechecking";
import { ClassType } from "../types/ClassType";
import { getOperatorOverloadType, isCallable, matchCall } from "../../typechecking/OperatorOverload";
import { InterfaceType } from "../types/InterfaceType";
import { FFIMethodType } from "../types/FFIMethodType";
import { VariantConstructorType } from "../types/VariantConstructorType";

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
            // TODO: implement method call
            throw new Error("Method call not implemented");
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

        throw ctx.parser.customError(`Not implemented`, this.location);
    }
}