/**
 * Filename: NamedStructConstructionExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a named struct creation.
 *          { x: 1, y: 2 }
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { Expression } from "./Expression";

export type KeyValueExpressionPair = {
    name: string,
    value: Expression,
    location: SymbolLocation
}

export class NamedStructConstructionExpression extends Expression {
    fields: KeyValueExpressionPair[];
    
    constructor(location: SymbolLocation, fields: KeyValueExpressionPair[]) {
        super(location, "named_struct_construction");
        this.fields = fields;
    }
}