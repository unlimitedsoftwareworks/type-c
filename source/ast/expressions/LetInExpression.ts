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
import { DataType } from "../types/DataType";
import { matchDataTypes } from "../../typechecking/TypeChecking";

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

        this.variables.forEach(v => this.context.addSymbol(v));
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        // infer the variables
        this.variables.forEach(v => v.infer(ctx));
        this.inferredType = this.inExpression.infer(this.context, hint);

        this.checkHint(this.context);
        this.isConstant = this.inExpression.isConstant;
        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): LetInExpression{
        return new LetInExpression(this.location, ctx, this.variables.map(v => v.clone(typeMap, ctx)), this.inExpression.clone(typeMap, ctx));
    }
}