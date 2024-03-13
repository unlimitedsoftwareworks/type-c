/**
 * Filename: CastExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a cast Expression x as Y
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Expression } from "./Expression";

export class CastExpression extends Expression {
    target: DataType;

    /**
     * Safe cast: results in a nullable if the cast fails
     * Regular cast: Ususally safe and used when the cast is guarenteed to succeed
     * Force cast: At your own risk, this cast will not check for nullability and will result in a runtime error if the cast fails
     */
    castType : "safe" | "regular" | "force" = "regular";

    // expression to cast
    expression: Expression;

    constructor(location: SymbolLocation, expression: Expression, target: DataType, castType: "safe" | "regular" | "force" = "regular") {
        super(location, "cast_op");
        this.target = target;
        this.expression = expression;
        this.castType = castType;
    }
}