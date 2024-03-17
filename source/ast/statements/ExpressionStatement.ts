/**
 * Filename: ExpressionStatement.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an statement that is an expression
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Expression } from "../expressions/Expression";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Statement } from "./Statement";


export class ExpressionStatement extends Statement {
    expression: Expression;

    constructor(location: SymbolLocation, expression: Expression) {
        super(location, "stmt_expression");
        this.expression = expression;
    }

    infer(ctx: Context){
        this.expression.infer(ctx, null);
    }

    clone(typeMap: {[key: string]: DataType}, ctx: Context): ExpressionStatement {
        let newExpression = this.expression.clone(typeMap, ctx);
        return new ExpressionStatement(this.location, newExpression);
    }
}