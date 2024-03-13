/**
 * Filename: WildCardPatternExpression
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a wildcard pattern expression _
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { PatternExpression } from "./PatternExpression";

export class WildCardPatternExpression extends PatternExpression {
    constructor(location: SymbolLocation) {
        super(location, "wildcard");
    }
}