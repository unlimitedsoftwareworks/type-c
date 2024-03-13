/**
 * Filename: UnionType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a union type, used only for generic type constraints <T: Serializable | Comparable>
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";

export class UnionType extends DataType {
    left: DataType;
    right: DataType;

    constructor(location: SymbolLocation, left: DataType, right: DataType) {
        super(location, "union");

        this.left = left;
        this.right = right;
    }

    flatten(): DataType[] {
        throw new Error("Method not implemented.");
    }


    resolve(ctx: Context) {
        throw new Error("Cannot resolve union type");
    }

    toString(): string {
        return `union`;
    }

    shortname(): string {
        return `@union{lhs:${this.left.shortname()},rhs:${this.right.shortname()}}`;
    }
}