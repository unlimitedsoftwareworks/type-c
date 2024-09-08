/**
 * Filename: DoExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a do-expression let x = do { .. return 0 }
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DeclaredVariable } from "../symbol/DeclaredVariable";
import { Expression } from "./Expression";
import { DataType } from "../types/DataType";
import { BlockStatement } from "../statements/BlockStatement";
import { ReturnStatement } from "../statements/ReturnStatement";
import { LetInExpression } from "./LetInExpression";
import { findCompatibleTypes } from "../../typechecking/TypeInference";
import { matchDataTypes } from "../../typechecking/TypeChecking";

export class DoExpression extends Expression {
    // multiple variables can be declared in a let binding
    block: BlockStatement | null;

    context: Context;

    // flag to check if the function was inferred, to avoid multiple inferences
    wasInferred: boolean = false;

    // cache of return statements, used for type checking
    returnStatements: { stmt: ReturnStatement, ctx: Context }[] = [];

    constructor(location: SymbolLocation, context: Context, block: BlockStatement | null) {
        super(location, "do_expression");
        this.block = block;
        this.context = context;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        this.setHint(hint);
        this.block?.infer(ctx);

        // make sure we have at least one statement
        if(this.block?.statements.length === 0){
            throw ctx.parser.error("Do-expression must have at least one statement", this.location);
        }

        // make sure the last statement is a return statement
        let lastStatement = this.block?.statements[this.block.statements.length - 1];
        if(lastStatement && !(lastStatement instanceof ReturnStatement)){
            throw ctx.parser.error("Do-expression must end with a return statement", lastStatement.location);
        }

        // now make sure the return type is compatible with the hint
        let returnTypes = this.returnStatements.map(ret => ret.stmt.getReturnType(ret.ctx));
        let unifiedType = findCompatibleTypes(ctx, returnTypes);

        if (!unifiedType) {
            throw ctx.parser.error("Do-expression must return a common type, instead, returned " + returnTypes.map(t => t.shortname()).join(", "), this.location);
        }

        this.inferredType = unifiedType;
        this.checkHint(ctx);

        return unifiedType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): DoExpression{
        let newContext = this.context.clone(typeMap, ctx);
        let newDO = new DoExpression(this.location, newContext, this.block!.clone(typeMap, newContext));

        return newDO;
    }
}