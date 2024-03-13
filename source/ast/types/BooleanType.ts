/**
 * Filename: BooleanType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a boolean type
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";

export class BooleanType extends DataType {
    constructor(location: SymbolLocation){
        super(location, "bool");
    }

    resolve(ctx: Context) {
        // nothing to do
    }


    shortname(): string {
        return "bool"
    }

    serialize(): string {
        return "@bool"
    }
}