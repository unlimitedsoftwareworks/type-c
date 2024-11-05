/**
 * Filename: ReturnStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a return statement, return expression or return
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Expression } from "../expressions/Expression";
import { TupleConstructionExpression } from "../expressions/TupleConstructionExpression";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { VoidType } from "../types/VoidType";
import { Statement } from "./Statement";


export class ReturnStatement extends Statement {
    returnExpression: Expression | null;

    constructor(location: SymbolLocation, expression: Expression | null = null){
        super(location, "return");
        this.returnExpression = expression;
    }

    infer(ctx: Context){
        if(this.returnExpression){
            //if(this.returnExpression instanceof TupleConstructionExpression) {
                //this.returnExpression.inferReturn(ctx, this.getReturnType(ctx));
            //}
            //else {
            this.returnExpression.inferReturn(ctx, this.getReturnType(ctx));
            //}
        }
    }


    getReturnType(ctx: Context): DataType {
        if(this.returnExpression){
            // we need to infer the expression to get the return type
            if(this.returnExpression instanceof TupleConstructionExpression) {
                return this.returnExpression.inferReturn(ctx, null);
            }
            else {
                return this.returnExpression.infer(ctx, null);
            }
        }
        else {
            return new VoidType(this.location);
        }
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): ReturnStatement {
        let newExpression = this.returnExpression ? this.returnExpression.clone(typeMap, ctx) : null;
        let newReturn = new ReturnStatement(this.location, newExpression);
        ctx.findParentFunction()?.returnStatements.push({ctx: ctx, stmt: newReturn});
        return newReturn;
    }
}