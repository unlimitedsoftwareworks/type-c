/**
 * Filename: IndexSetExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an array index set
 *      x[1] = y, x["hi", 2, 3.14] = "woupsie"
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { OperatorOverloadState } from "../other/OperatorOverloadState";
import { Expression } from "./Expression";

export class IndexSetExpression extends Expression {
    lhs: Expression;
    indexes: Expression[];
    value: Expression;

    // capture the state of the operator overload, if any
    // default is not overloaded
    operatorOverloadState: OperatorOverloadState = new OperatorOverloadState();

    constructor(location: SymbolLocation, lhs: Expression, indexes: Expression[], value: Expression) {
        super(location, "index_set");
        this.lhs = lhs;
        this.indexes = indexes;
        this.value = value;
    }
}