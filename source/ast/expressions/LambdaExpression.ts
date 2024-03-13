/**
 * Filename: LambdaExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an anonymous function or a lambda expression
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { BlockStatement } from "../statements/BlockStatement";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { FunctionType } from "../types/FunctionType";
import { Expression } from "./Expression";

export class LambdaExpression extends Expression {
    header: FunctionType;
    expression: Expression | null = null;
    body: BlockStatement | null = null;
    
    /**
     * the context of the lambda expression, used to evaluate the body/expression of the lambda
     */ 
    context: Context;

    constructor(location: SymbolLocation, newContext: Context, header: FunctionType, body: BlockStatement | null, expression: Expression | null) {
        super(location, "lambda");
        this.header = header;
        this.body = body;
        this.expression = expression;

        // configure the context
        this.context = newContext;
        this.context.setOwner(this);
    }
}