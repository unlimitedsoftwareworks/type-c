/**
 * Filename: LetInExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a nested let binding: let z = 1 in z + 2
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DeclaredVariable } from "../symbol/DeclaredVariable";
import { Expression } from "./Expression";

export class LetInExpression extends Expression {
    // multiple variables can be declared in a let binding
    variables: DeclaredVariable[];
    inExpression: Expression;
    context: Context;

    constructor(location: SymbolLocation, context: Context, variables: DeclaredVariable[], inExpression: Expression) {
        super(location, "let_in");
        this.variables = variables;
        this.inExpression = inExpression;
        this.context = context;
    }
}