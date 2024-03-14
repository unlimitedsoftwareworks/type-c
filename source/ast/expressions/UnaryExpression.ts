/**
 * Filename: UnaryExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an Unary expression
 *          i++
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { OperatorOverloadState } from "../other/OperatorOverloadState";
import { Expression } from "./Expression";
import { Context } from "../symbol/Context";
import { DataType } from "../types/DataType";
import { NullableType } from "../types/NullableType";
import { unaryTypeCheckers } from "../../typechecking/UnaryExpressionInference";
import { matchDataTypes } from "../../typechecking/typechecking";

export type UnaryOperator = "-" | "!" | "!!" | "~" | "pre++" | "post++" | "pre--" | "post--" | "await"

export class UnaryExpression extends Expression {
    expression: Expression;
    operator: UnaryOperator;

    // capture the state of the operator overload, if any
    // default is not overloaded
    operatorOverloadState: OperatorOverloadState = new OperatorOverloadState();

    constructor(location: SymbolLocation, expression: Expression, operator: UnaryOperator) {
        super(location, "unary_op");
        this.expression = expression;
        this.operator = operator;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        let uhsType: DataType;

        // when we have a denull operator and a hint, we must infer the expression as a nullable
        if((this.operator === "!!") && (hint !== null)) {
            uhsType = this.expression.infer(ctx, new NullableType(this.location, hint));
        }
        else {
            uhsType = this.expression.infer(ctx, hint);
        }

        this.inferredType = unaryTypeCheckers[this.operator](ctx, uhsType, this);

        this.checkHint(ctx);
        return this.inferredType;
    }
}