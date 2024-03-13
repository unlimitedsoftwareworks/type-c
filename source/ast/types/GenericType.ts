/**
 * Filename: GenericType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a generic type, which can have a constraint <T: Serializable | Comparable>
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { UnionType } from "./UnionType";
import { Context } from "../symbol/Context";
import { matchDataTypes } from "../../typechecking/typechecking";

export class GenericTypeConstraint {
    types: DataType[] = [];

    /**
     * @param types Possibly a union type
     */
    constructor(types: DataType | null) {
        this.types = []
        if(types instanceof UnionType) {
            this.types = types.flatten();
        }
        else if (types !== null) {
            this.types.push(types);
        }
    }


    /**
     * Checks if a given type matches the constraints
     * @param type 
     * @param scope 
     */
    checkType(ctx: Context, type: DataType): boolean {
        if(this.types.length == 0) return true;
        for(let t of this.types){
            let res = matchDataTypes(ctx, t, type);
            if(res.success) return true;
        }

        return false;
    }
}

export class GenericType extends DataType {
    name: string;
    constraint: GenericTypeConstraint;
    constructor(location: SymbolLocation, name: string, constraint: GenericTypeConstraint) {
        super(location, "generic");
        this.name = name;
        this.constraint = constraint;
    }

    resolve(ctx: Context): DataType {
        /**
         * We throw an error because resolving generic types is not supported.
         * Resolving types must occur when all types are concrete.
         */
        ctx.parser.customError("Generic type not resolved", this.location)
    }

    shortname(): string {
        return "^"+this.name;
    }

    serialize(): string {
        return `@generic{${this.name},@constraint{${this.constraint.types.map(e => e.serialize()).join(",")}}}`
    }
}