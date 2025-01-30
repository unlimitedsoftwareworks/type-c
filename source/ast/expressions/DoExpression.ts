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
import { Expression, InferenceMeta } from "./Expression";
import { DataType } from "../types/DataType";
import { BlockStatement } from "../statements/BlockStatement";
import { ReturnStatement } from "../statements/ReturnStatement";
import { LetInExpression } from "./LetInExpression";
import { findCompatibleTypes } from "../../typechecking/TypeInference";
import { matchDataTypes } from "../../typechecking/TypeChecking";
import { TupleConstructionExpression } from "./TupleConstructionExpression";

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

    infer(ctx: Context, hint: DataType | null, meta?: InferenceMeta): DataType {
        this.setHint(hint);
        // do not allow re-inferring
        this.block?.infer(ctx, true);

        // make sure we have at least one statement
        if (this.block?.statements.length === 0) {
            ctx.parser.error("Do-expression must have at least one statement", this.location);
        }

        // make sure the last statement is a return statement
        let lastStatement = this.block?.statements[this.block.statements.length - 1];
        if (lastStatement && !(lastStatement instanceof ReturnStatement)) {
            ctx.parser.error("Do-expression must end with a return statement", lastStatement.location);
        }

        // make sure every return statement has a return expression and it is not a tuple construction
        for (let i = 0; i < this.returnStatements.length; i++) {
            let ret = this.returnStatements[i].stmt;
            if (ret.returnExpression == null) {
                ctx.parser.error("Return statement must have a return expression", ret.location);
            }
            if (ret.returnExpression instanceof TupleConstructionExpression) {
                ctx.parser.error("Tuple construction is not allowed in return statements", ret.location);
            }
        }

        if (hint == null) {
            this.block!.infer(ctx, true);
            // list of return types from the return statements
            let returnTypes: DataType[] = [];

            // if a single void is found (meaning a return without value), the return type is void

            for (const ret of this.returnStatements) {
                let retType = ret.stmt.getReturnType(ret.ctx);
                returnTypes.push(retType);
            }

            let allMatch = findCompatibleTypes(ctx, returnTypes);
            if (allMatch === null) {
                ctx.parser.customError(`Mixed return data types in do-expression body`, this.block!.location);
            }

            this.inferredType = allMatch;

        }
    
        else {
            this.block!.infer(ctx, true);

            // all return types must match the defined return type
            for (let i = 0; i < this.returnStatements.length; i++) {
                let retType = this.returnStatements[i].stmt.getReturnType(this.returnStatements[i].ctx);
                if (!matchDataTypes(ctx, hint, retType, false).success) {
                    ctx.parser.customError(`Return type ${retType.getShortName()} does not match the defined return type ${hint.getShortName()}`, this.returnStatements[i].stmt.location);
                }
                
                this.returnStatements[i].stmt.returnExpression?.setHint(hint);
            }
            this.inferredType = hint;
        }

        this.returnStatements.forEach(ret => {
            ret.stmt.returnExpression?.inferReturn(ret.ctx, this.inferredType);
        });
        
        this.checkHint(ctx);
        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): DoExpression {
        let newContext = this.context.clone(typeMap, ctx);
        let newDO = new DoExpression(this.location, newContext, this.block!.clone(typeMap, newContext));

        return newDO;
    }
}