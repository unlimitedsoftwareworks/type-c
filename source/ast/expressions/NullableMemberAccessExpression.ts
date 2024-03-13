/**
 * Filename: NullableMemberAccessExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a nullable member access expressions.
 *          x?.y
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { ElementExpression } from "./ElementExpression";
import { Expression } from "./Expression";

 export class NullableMemberAccessExpression extends Expression {
    left: Expression;
    right: ElementExpression;

    constructor(location: SymbolLocation, left: Expression, right: ElementExpression) {
        super(location, "member_access");
        this.left = left;
        this.right = right;
    }
}
