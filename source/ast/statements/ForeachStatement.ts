/**
 * Filename: ForeachStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a foreach loop
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { BuiltinModules } from "../../BuiltinModules";
import { Expression } from "../expressions/Expression";
import { InterfaceMethod } from "../other/InterfaceMethod";
import { Context } from "../symbol/Context";
import { DeclaredVariable } from "../symbol/DeclaredVariable";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ArrayType } from "../types/ArrayType";
import { BasicType } from "../types/BasicType";
import { ClassType } from "../types/ClassType";
import { CoroutineType } from "../types/CoroutineType";
import { DataType } from "../types/DataType";
import { GenericType, GenericTypeConstraint } from "../types/GenericType";
import { InterfaceType } from "../types/InterfaceType";
import { BlockStatement } from "./BlockStatement";
import { Statement } from "./Statement";

export class ForeachStatement extends Statement {

    body: BlockStatement;
    context: Context;

    valueIteratorName: string
    indexIteratorName: string
    iterableExpression: Expression

    valueIteratorVariable: DeclaredVariable | null = null;
    indexIteratorVariable: DeclaredVariable | null = null;

    tmpIteratorVariable: DeclaredVariable | null = null;


    iteratorType: "coroutine" | "AbstractIterable" | "array" = "array";
    useConst: boolean;


    static iteratorId = 0;
    static tmpIteratorId = 0;

    static reset() {
        ForeachStatement.iteratorId = 0;
        ForeachStatement.tmpIteratorId = 0;
    }

    constructor(location: SymbolLocation, context: Context, useConst: boolean, valueIteratorName: string, indexIteratorName: string | null, iterableExpression: Expression, body: BlockStatement) {
        super(location, "foreach");
        this.valueIteratorName = valueIteratorName;
        this.indexIteratorName = indexIteratorName ?? "$fcounter_" + ForeachStatement.iteratorId++;
        this.body = body;
        this.context = context;
        this.iterableExpression = iterableExpression;
        this.useConst = useConst;
    }

    infer(ctx: Context){
        /**
         * .infer will be called again from the code generator when converting the foreach to for loop.
         * When nesting foreach, this results in the inner foreach being re-inferred, so we back up
         * the inference state to avoid re-inferring the same foreach, which results in redeclaring its
         * variables
         */

        // must declare iterators as variables, but first we infer the expression.
        let iterableType = this.iterableExpression.infer(ctx);

        if(iterableType.is(ctx, ClassType) || iterableType.is(ctx, InterfaceType)){
            this.inferClassOrInterfaceIterator(ctx, iterableType as ClassType);
        }

        if (iterableType.is(ctx, CoroutineType)) {
            this.inferCoroutineIterator(ctx, iterableType as CoroutineType);
        }

        if (iterableType.is(ctx, ArrayType)) {
            this.inferArrayIterator(ctx, iterableType as ArrayType);
        }

        this.body.infer(this.context);
    }

    inferArrayIterator(ctx: Context, iterableType: ArrayType){
        this.iteratorType = "array";
        let elementType = iterableType.arrayOf;
        this.registerIteratorVariables(ctx, elementType, new BasicType(this.location, "u64"));
    }

    inferCoroutineIterator(ctx: Context, iterableType: CoroutineType){
        throw new Error("Foreach statement does not support coroutines");
    }

    inferClassOrInterfaceIterator(ctx: Context, iterableType: ClassType | InterfaceType){
        this.iteratorType = "AbstractIterable";
        /**
         * 1. Search for a method called `toIterator` with no args
         * 2. Compare it with the built-in `ArrayIterator` interface
         * 3. The builtin-in interface is generic, so we need to extract them
         */

        let toIteratorMethod: InterfaceMethod | null = null;
        if(iterableType.is(ctx, ClassType)){
            let iterableClass = iterableType.to(ctx, ClassType) as ClassType;
            let candidates = iterableClass.getMethodBySignature(ctx, "getIterable", [], null, []);

            if(candidates.length == 0){
                ctx.parser.customError(`Class ${iterableClass.getShortName()} does not have a 'getIterable' method`, this.location);
            }

            if(candidates.length > 1){
                ctx.parser.customError(`Class ${iterableClass.getShortName()} has multiple 'getIterable' methods`, this.location);
            }

            toIteratorMethod = candidates[0];   
        }
        else {
            let iterableInterface = iterableType.to(ctx, InterfaceType) as InterfaceType;
            let candidates = iterableInterface.getMethodBySignature(ctx, "getIterable", [], null);

            if(candidates.length == 0){
                ctx.parser.customError(`Interface ${iterableInterface.getShortName()} does not have a 'getIterable' method`, this.location);
            }

            if(candidates.length > 1){
                ctx.parser.customError(`Interface ${iterableInterface.getShortName()} has multiple 'getIterable' methods`, this.location);
            }

            toIteratorMethod = candidates[0];
        }
        
        /**
         * This case happens when the method is defined later in array, and a previous method uses foreach such as:
         *     fn push(array: Array<T>) {
         *         this.extendIfNeeded(array.length())
         *         foreach v in array {
         *             this.push(v)
         *         }
         *     }
         *     ..
         * 
         *     fn getIterable() = new ArrayIterator<T>(this)
         * 
         *     The combination of lack of hint for getIterable and the fact that we are iterating over the same array class
         *     Results in toIteratorMethod being unresolved/uninferred, so we need to infer it here
         */
        if(toIteratorMethod?._sourceMethod?.inferred() === false){
            toIteratorMethod?._sourceMethod?.infer(toIteratorMethod?._sourceMethod?.context);
        }

        // extract generic parameters, name must match the definition
        let genericMap = {"T": new GenericType(this.location, "T", new GenericTypeConstraint(null))};
        let genericParam = BuiltinModules.ArrayIterator!.getGenericParameters(ctx, toIteratorMethod!.header.returnType, genericMap);

        let valueIteratorType = genericParam["T"];

        this.registerIteratorVariables(ctx, valueIteratorType, toIteratorMethod.header.returnType);
    }

    registerIteratorVariables(ctx: Context, elementType: DataType, itertableTmpType?: DataType){
        elementType.resolve(ctx);

        this.valueIteratorVariable = new DeclaredVariable(this.location, this.valueIteratorName, null as any, elementType, this.iterableExpression.isConstant == true || this.useConst, true, false);
        this.context.addSymbol(this.valueIteratorVariable);
        this.valueIteratorVariable.inferWithoutAssignment(this.context);

        this.indexIteratorVariable = new DeclaredVariable(this.location, this.indexIteratorName, null as any, new BasicType(this.location, "u64"), this.useConst, true, false);
        this.context.addSymbol(this.indexIteratorVariable);
        this.indexIteratorVariable.inferWithoutAssignment(this.context);

        let iterableType = itertableTmpType!;
        this.tmpIteratorVariable = new DeclaredVariable(this.location, "$fabsiter_" + ForeachStatement.tmpIteratorId++, null as any, iterableType, false, true, false);
        this.context.addSymbol(this.tmpIteratorVariable);
        this.tmpIteratorVariable.inferWithoutAssignment(this.context);
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): ForeachStatement {
        let newContext = this.context.clone(typeMap, ctx);
        let newBody = this.body.clone(typeMap, newContext);
        return new ForeachStatement(this.location, newContext, this.useConst, this.valueIteratorName, this.indexIteratorName, this.iterableExpression.clone(typeMap, newContext), newBody);
    }
}