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
import { Expression } from "../ast/expressions/Expression";
import { FunctionCallExpression } from "../ast/expressions/FunctionCallExpression";
import { IndexAccessExpression } from "../ast/expressions/IndexAccessExpression";
import { IntLiteralExpression, StringLiteralExpression } from "../ast/expressions/LiteralExpression";
import { MemberAccessExpression } from "../ast/expressions/MemberAccessExpression";
import { TupleConstructionExpression } from "../ast/expressions/TupleConstructionExpression";
import { UnaryExpression } from "../ast/expressions/UnaryExpression";
import { BlockStatement } from "../ast/statements/BlockStatement";
import { ExpressionStatement } from "../ast/statements/ExpressionStatement";
import { ForeachStatement } from "../ast/statements/ForeachStatement";
import { ForStatement } from "../ast/statements/ForStatement";
import { Context } from "../ast/symbol/Context";
import { BooleanType } from "../ast/types";

export function convertForeachArrayToFor(stmt: ForeachStatement): ForStatement {
    // let xxx = arr.length
    let lengthExpression = new MemberAccessExpression(stmt.location, stmt.iterableExpression, new ElementExpression(stmt.location, "length"));
    

    let lengthVariable = new BinaryExpression(
        stmt.location,
        new ElementExpression(stmt.location, stmt.tmpIteratorVariable!.name),
        lengthExpression,
        "="
    )

    // foreach i,v in arr -> for i = 0; i < arr.length; i++) { v = arr[i], ... }
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

    let newFor = new ForStatement(
        stmt.location,
        stmt.context,
        [
            new ExpressionStatement(
                stmt.location,
                lengthVariable
            ),
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
            lengthVariable,
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

export function convertForeachAbstractIterableToFor(stmt: ForeachStatement): ForStatement {
    /**
     * foreach i,v in iterable -> for i = 0; iterable.hasNext(); i++) { v = iterable.next(), ... }
     */

    // let xxx = iterableExpression.getIterable()
    let initExpression = new BinaryExpression(
        stmt.location,
        new ElementExpression(stmt.location, stmt.tmpIteratorVariable!.name),
        new FunctionCallExpression(
            stmt.location,
            new MemberAccessExpression(
                stmt.location, 
                stmt.iterableExpression, 
                new ElementExpression(stmt.location, "getIterable")
            ),
            []
        ),
        "="
    )

    let conditionExpression = new FunctionCallExpression(
        stmt.location,
        new MemberAccessExpression(stmt.location, new ElementExpression(stmt.location, stmt.tmpIteratorVariable!.name), new ElementExpression(stmt.location, "hasNext")),
        []
    )

    let tupleAssignment = new BinaryExpression(
        stmt.location,
        // (i, v) = iterator.next()
        new TupleConstructionExpression(stmt.location, [
            new ElementExpression(stmt.location, stmt.indexIteratorName),
            new ElementExpression(stmt.location, stmt.valueIteratorName)
        ]),
        new FunctionCallExpression(
            stmt.location, 
            new MemberAccessExpression(
                stmt.location, 
                new ElementExpression(
                    stmt.location, 
                    stmt.tmpIteratorVariable!.name
                ), 
                new ElementExpression(stmt.location, "next")
            ), 
            []
        ),
        "="
    )

    let forStatement = new ForStatement(
        stmt.location,
        stmt.context,
        [
            new ExpressionStatement(stmt.location, initExpression)
        ],
        conditionExpression,
        [
        ],
        new BlockStatement(
            stmt.location,
            stmt.body.context,
            [
                new ExpressionStatement(stmt.location, tupleAssignment),
                ...stmt.body.statements
            ],
        )
    )

    return forStatement;
}

export function convertStringEq(ctx: Context, lhs: Expression, rhs: Expression): Expression {
    let expression = new FunctionCallExpression(lhs.location, new MemberAccessExpression(lhs.location, lhs, new ElementExpression(lhs.location, "eq")), [rhs]);
    expression.infer(ctx, new BooleanType(lhs.location));
    return expression;
}

export function convertStringNotEq(ctx: Context, lhs: Expression, rhs: Expression): Expression {
    let baseExpression = new FunctionCallExpression(lhs.location, new MemberAccessExpression(lhs.location, lhs, new ElementExpression(lhs.location, "eq")), [rhs]);
    let expression = new UnaryExpression(lhs.location, baseExpression, "!");
    expression.infer(ctx, new BooleanType(lhs.location));
    return expression;
}

export function compareStringToEnum(ctx: Context, lhs: Expression, value: string): Expression {
    let cmp = new BinaryExpression(lhs.location, lhs, new StringLiteralExpression(lhs.location, value), "==");
    cmp.infer(ctx, new BooleanType(lhs.location));
    return cmp;
}