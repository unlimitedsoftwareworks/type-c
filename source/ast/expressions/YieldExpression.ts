/**
 * Filename: YieldExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a yield expression in a coroutine
 *          yield (x, false)
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

/**
 * A yield expression cannot be used outside of a coroutine callable function
 * Also a yield expression cannot be used alongside return statement in the same function.
 */

import { ReturnStatement } from "../statements/ReturnStatement";
import { Context } from "../symbol/Context";
import { DeclaredFunction } from "../symbol/DeclaredFunction";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { TupleType } from "../types/TupleType";
import { VoidType } from "../types/VoidType";
import { Expression, InferenceMeta } from "./Expression";
import { LambdaDefinition, LambdaExpression } from "./LambdaExpression";
import { TupleConstructionExpression } from "./TupleConstructionExpression";

export class YieldExpression extends Expression {
    yieldExpression: Expression;
    isFinal: boolean;
    
    constructor(location: SymbolLocation, yieldExpression: Expression, isFinal: boolean = false) {
        super(location, "yield");
        this.yieldExpression = yieldExpression;
        this.isFinal = isFinal;
    }

    infer(ctx: Context, hint: DataType | null, meta?: InferenceMeta): DataType {
        if(this.yieldExpression) {
            this.yieldExpression.inferReturn(ctx, this.getReturnType(ctx), meta);
        }

        let parentFunction = ctx.findParentFunction();
        if(parentFunction && (parentFunction instanceof DeclaredFunction) || (parentFunction instanceof LambdaExpression)) {
            parentFunction.isCoroutineCallable = true;
        }
        else {
            ctx.parser.customError("Cannot use yield expression outside of a function/lambda expression", this.location);
        }

        let header = (parentFunction instanceof DeclaredFunction) ? parentFunction.prototype.header : (parentFunction as LambdaExpression).header;

        /**
         * yield returns the new arguments when the coroutine is resumed
         * if we have 0 arguments, we return void
         * if we have 1 argument, we return it
         * if we have multiple arguments, we return a tuple
         */

        // change of plans, yield returns void
        // another change of plans, yield returns the function's return type
        // this.inferredType = new VoidType(this.location);
        this.inferredType = header.returnType;
        
        /*
        if (header.parameters.length == 0) {
            this.inferredType = new VoidType(this.location);
        }
        else if (header.parameters.length == 1) {
            this.inferredType = header.parameters[0].type;
        }
        else {
            this.inferredType = new TupleType(this.location, header.parameters.map(param => param.type));
        }*/


        return this.inferredType;
    }

    getReturnType(ctx: Context): DataType {
        if(this.yieldExpression){
            // we need to infer the expression to get the return type
            if(this.yieldExpression instanceof TupleConstructionExpression) {
                return this.yieldExpression.inferReturn(ctx, null);
            }
            else {
                return this.yieldExpression.infer(ctx, null);
            }
        }
        else {
            return new VoidType(this.location);
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): YieldExpression {
        let newExpression = this.yieldExpression ? this.yieldExpression.clone(typeMap, ctx) : null;
        let newYield = new YieldExpression(this.location, newExpression!, this.isFinal);
        (ctx.findParentFunction() as (DeclaredFunction | LambdaExpression))!.yieldExpressions.push({ctx: ctx, yield: newYield});
        return newYield;
    }
}
