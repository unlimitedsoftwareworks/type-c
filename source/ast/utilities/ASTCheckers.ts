/**
 * Filename: ASTCheckers.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Utility functions for checking the AST, such as checking if an expression is a member access, etc
 * 
 * Type-C Compiler, Copyright (c) 2023-2025 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Expression } from "../expressions/Expression";
import { MemberAccessExpression } from "../expressions/MemberAccessExpression";
import { Context } from "../symbol/Context";
import { PartialStructType } from "../types/PartialStruct";

export namespace ASTCheck {
    /**
     * Checks if the expression is a partial struct access
     * needed by assignment binary expression, to check if we are accessing partial struct in read mode
     * or write mode. Because read mode is not allowed unless we are within a nullish coalescing operator,
     * while writing is allowed.
     */
    export function isPartialStructAccess(ctx: Context, expr: Expression): boolean {
        if(expr instanceof MemberAccessExpression) {
            return expr.left.inferredType!.is(ctx, PartialStructType);
        }
        return false;
    }
}