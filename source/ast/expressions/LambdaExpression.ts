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
import { DataType } from "../types/DataType";
import { matchDataTypes } from "../../typechecking/TypeChecking";
import { ReturnStatement } from "../statements/ReturnStatement";
import { inferFunctionHeader } from "../../typechecking/TypeInference";
import { FunctionCodegenProps } from "../../codegenerator/FunctionCodegenProps";
import { Symbol } from "../symbol/Symbol";

/**
 * Since lambda expression are not registered in the symbol table, 
 * We create a class that extends the Symbol and registers the lambda expression
 * within the global context
 */
export class LambdaDefinition extends Symbol {
    static counter: number = 0;
    expression: LambdaExpression;

    constructor(location: SymbolLocation, expression: LambdaExpression) {
        let name = "lambda-"+(LambdaDefinition.counter++);
        super(location, "lambda", name);
        this.expression = expression;

        this.uid = name;
    }
}


export class LambdaExpression extends Expression {
    header: FunctionType;
    expression: Expression | null = null;
    body: BlockStatement | null = null;
    
    /**
     * the context of the lambda expression, used to evaluate the body/expression of the lambda
     */ 
    context: Context;
    // cache of return statements, used for type checking
    returnStatements: {stmt: ReturnStatement, ctx: Context}[] = [];

    definition: LambdaDefinition;


    /**
     * Code gen properties
     */
    codeGenProps: FunctionCodegenProps = new FunctionCodegenProps();

    constructor(location: SymbolLocation, newContext: Context, header: FunctionType, body: BlockStatement | null, expression: Expression | null) {
        super(location, "lambda");
        this.header = header;
        this.body = body;
        this.expression = expression;

        // configure the context
        this.context = newContext;
        this.context.setOwner(this);

        // add the parameters to the context
        for (let i = 0; i < header.parameters.length; i++) {
            newContext.addSymbol(header.parameters[i]);
            this.codeGenProps.registerArgSymbol(header.parameters[i]);
        }

        this.definition = new LambdaDefinition(location, this);
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        this.inferredType = this.header;
        inferFunctionHeader(this.context, 'function', this.returnStatements, this.header, this.body, this.expression);
        this.codeGenProps.reportUnusedSymbols(ctx, this.header);

        this.checkHint(ctx);
        this.isConstant = false;

        ctx.registerToGlobalContext(this.definition);

        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): LambdaExpression{
        let newCtx = this.context.clone(typeMap, ctx);
        return new LambdaExpression(this.location, newCtx, this.header.clone(typeMap), this.body?.clone(typeMap, newCtx) || null, this.expression?.clone(typeMap, newCtx) || null);
    }
}