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


import { Expression } from "../expressions/Expression";
import { Context } from "../symbol/Context";
import { DeclaredVariable } from "../symbol/DeclaredVariable";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ArrayType } from "../types/ArrayType";
import { BasicType } from "../types/BasicType";
import { ClassType } from "../types/ClassType";
import { CoroutineType } from "../types/CoroutineType";
import { DataType } from "../types/DataType";
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

    iteratorType: "coroutine" | "class" | "interface" | "array" = "array";
    useConst: boolean;

    static iteratorId = 0;

    constructor(location: SymbolLocation, context: Context, useConst: boolean, valueIteratorName: string, indexIteratorName: string | null, iterableExpression: Expression, body: BlockStatement) {
        super(location, "foreach");
        this.valueIteratorName = valueIteratorName;
        this.indexIteratorName = indexIteratorName ?? "$foreach_counter_" + ForeachStatement.iteratorId++;
        this.body = body;
        this.context = context;
        this.iterableExpression = iterableExpression;
        this.useConst = useConst;
    }

    infer(ctx: Context){
        // must declare iterators as variables, but first we infer the expression.
        let iterableType = this.iterableExpression.infer(ctx);

        if(iterableType.is(ctx, ClassType)){
            this.inferClassIterator(ctx, iterableType as ClassType);
        }

        if(iterableType.is(ctx, InterfaceType)){
            this.inferInterfaceIterator(ctx, iterableType as InterfaceType);
        }

        if (iterableType.is(ctx, CoroutineType)) {
            this.inferCoroutineIterator(ctx, iterableType as CoroutineType);
        }

        if (iterableType.is(ctx, ArrayType)) {
            this.inferArrayIterator(ctx, iterableType as ArrayType);
        }

        this.body.infer(ctx);
    }

    inferArrayIterator(ctx: Context, iterableType: ArrayType){
        this.iteratorType = "array";

        let elementType = iterableType.arrayOf;
        elementType.resolve(ctx);

        this.valueIteratorVariable = new DeclaredVariable(this.location, this.valueIteratorName, null as any, elementType, this.iterableExpression.isConstant == true || this.useConst, true, false);
        this.context.addSymbol(this.valueIteratorVariable);
        this.valueIteratorVariable.inferWithoutAssignment(ctx);

        this.indexIteratorVariable = new DeclaredVariable(this.location, this.indexIteratorName, null as any, new BasicType(this.location, "u64"), this.useConst, true, false);
        this.context.addSymbol(this.indexIteratorVariable);
        this.indexIteratorVariable.inferWithoutAssignment(ctx);
    }

    inferCoroutineIterator(ctx: Context, iterableType: CoroutineType){
        throw new Error("Foreach statement does not support coroutines");
    }

    inferClassIterator(ctx: Context, iterableType: ClassType){
        throw new Error("Foreach statement does not support classes");
    }

    inferInterfaceIterator(ctx: Context, iterableType: InterfaceType){
        throw new Error("Foreach statement does not support interfaces");
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): ForeachStatement {
        throw new Error("Foreach clone does not support cloning just yet");
    }
}