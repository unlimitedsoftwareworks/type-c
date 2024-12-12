/**
 * Filename: ASTTransformers.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Helper functions for transforming AST nodes from one form to another
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { BinaryExpression } from "../ast/expressions/BinaryExpression";
import { ElementExpression } from "../ast/expressions/ElementExpression";
import { IndexAccessExpression } from "../ast/expressions/IndexAccessExpression";
import { IntLiteralExpression } from "../ast/expressions/LiteralExpression";
import { MemberAccessExpression } from "../ast/expressions/MemberAccessExpression";
import { BlockStatement } from "../ast/statements/BlockStatement";
import { ExpressionStatement } from "../ast/statements/ExpressionStatement";
import { ForeachStatement } from "../ast/statements/ForeachStatement";
import { ForStatement } from "../ast/statements/ForStatement";

export function convertForeachArrayToFor(stmt: ForeachStatement): ForStatement {
    let valueAssignment = new BinaryExpression(
        stmt.location,
        new ElementExpression(stmt.location, stmt.valueIteratorName),
        new IndexAccessExpression(
            stmt.location, 
            stmt.iterableExpression, 
            [new ElementExpression(stmt.location, stmt.indexIteratorName)]
        ),
        "="
    )

    // must disable const check
    valueAssignment.ignoreConst();

    let newFor = new ForStatement(
        stmt.location,
        stmt.context,
        [
            new ExpressionStatement(
                stmt.location,
                new BinaryExpression(
                    stmt.location,
                    new ElementExpression(stmt.location, stmt.indexIteratorName),
                    new IntLiteralExpression(stmt.location, "0"),
                    "="
                )
            )
        ],
        new BinaryExpression(
            stmt.location,
            new ElementExpression(stmt.location, stmt.indexIteratorName),
            new MemberAccessExpression(stmt.location, stmt.iterableExpression, new ElementExpression(stmt.location, "length")),
            "<"
        ),
        [
            new BinaryExpression(
                stmt.location,
                new ElementExpression(stmt.location, stmt.indexIteratorName),
                new IntLiteralExpression(stmt.location, "1"),
                "+="
            )
        ],
        new BlockStatement(
            stmt.location,
            stmt.body.context,
            [
                new ExpressionStatement(
                    stmt.location, 
                    valueAssignment
                ),
                ...stmt.body.statements
            ],
        )
    )

    return newFor;
}