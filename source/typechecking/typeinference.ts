/**
 * Filename: typeinference.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Performs type inference, or find a common type for a list of types
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Expression } from "../ast/expressions/Expression";
import { BlockStatement } from "../ast/statements/BlockStatement";
import { ReturnStatement } from "../ast/statements/ReturnStatement";
import { Context } from "../ast/symbol/Context";
import { DataType } from "../ast/types/DataType";
import { FunctionType } from "../ast/types/FunctionType";
import { UnsetType } from "../ast/types/UnsetType";
import { VoidType } from "../ast/types/VoidType";

/**
 * Used to infer the return type of a function, given a list of return statements.
 * If the function or method has an unset return type, it will be inferred
 * @param ctx 
 * @param returnStatements 
 */
export function inferFunctionHeader(
    ctx: Context, 
    type: "method" | "function",
    returnStatements:  {stmt: ReturnStatement, ctx: Context}[], 
    header: FunctionType, 
    body: BlockStatement | null,
    expr: Expression | null) {
    
    const definedReturnType: DataType = header.returnType;

    // this should be unreachable, parser makes sure that. if it is, there is an issue with the arguments
    if ((body === null) && (expr === null)) {
        ctx.parser.customError(`${type} has no body nor expression`, ctx.location);
    }

    // if we have unset, we need to infer the type based on the return statements
    if(definedReturnType instanceof UnsetType) {
        /**
         * If it is a body, we have to go through all return statements and make sure they align
         */
        if(body !== null) {
            body.infer(ctx);

            // list of return types from the return statements
            let returnTypes: DataType[] = [];

            // if a single void is found (meaning a return without value), the return type is void
            let voidFound = false;

            for(const ret of returnStatements) {
                let retType = ret.stmt.getReturnType(ret.ctx);
                returnTypes.push(retType);
                if(retType instanceof VoidType) {
                    voidFound = true;
                }
            }

            /**
             * Case 1: Not a single return statement
             */
            if(returnTypes.length === 0) {
                header.returnType = new VoidType(ctx.location);
            }

            /**
             * Case 2: At least one void is found, then all must me void
             */
            if(voidFound) {
                let allVoid = returnTypes.every((t) => t instanceof VoidType);
                if(!allVoid) {
                    ctx.parser.customError(`Mixed return data types for ${type}`, body.location);
                }

                header.returnType = new VoidType(ctx.location);
            }

            /**
             * Case 3: Make sure all return types are the same
             */
            let allMatch = findCompatibleTypes(ctx, returnTypes);

            if(allMatch === null) {
                ctx.parser.customError(`Mixed return data types for ${type}`, body.location);
            }


            header.returnType = allMatch;
        }
        /**
         * If it is an expression, we can infer the type from the expression
         */
        else {
            header.returnType = expr!.infer(ctx);
        }
    }

    // now if we have void, all shall be void
    if(definedReturnType instanceof VoidType) {
        if(body !== null) {
            body.infer(ctx);
            for(const ret of returnStatements) {
                let retType = ret.stmt.getReturnType(ret.ctx);
                if(!(retType instanceof VoidType)) {
                    ctx.parser.customError(`Mixed return data types for ${type}`, body.location);
                }
            }
        }
        else {
            // WARNING: for expression, void is ALLOWED, the output is just discarded
            let retType = expr!.infer(ctx);
            if(!(retType instanceof VoidType)) {
                expr?.setHint(new VoidType(expr.location));
            }
        }

        header.returnType = new VoidType(ctx.location);
    }

    else {
        if(body) {
            body.infer(ctx);
            if(returnStatements.length === 0) {
                ctx.parser.customError(`${type} is required to return a value`, body.location);
            }

            let returnTypes = returnStatements.map((ret) => ret.stmt.getReturnType(ret.ctx));

            let allMatch = findCompatibleTypes(ctx, returnTypes);

            if(allMatch === null) {
                ctx.parser.customError(`Mixed return data types for ${type}`, body.location);
            }

            header.returnType = allMatch;
        }
        else {
            let retType = expr!.infer(ctx, definedReturnType);
        }
    }


    // We must update the hints of all return values, with the common type,
    // so the code generator can generate the correct code to cast to the final adequate type
    for(const ret of returnStatements) {
        ret.stmt.returnExpression?.setHint(header.returnType);
    }
}

export function findCompatibleTypes(ctx: Context, t: DataType[]): DataType | null {
    throw new Error("Not implemented");
    return null;
}
