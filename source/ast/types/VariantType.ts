/**
 * Filename: VariantType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 * Models a variant type
 * A variant type is a type that can be one of many algebraic subtypes.
 * for example: Tree = Leaf | Node, Leaf and Node are algebraic subtypes of Tree (Variant Constructors).
 * Tree is a variant type.
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {VariantConstructorType} from "./VariantConstructorType";
import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";

export class VariantType extends DataType {
    constructors: VariantConstructorType[];

    constructor(location: SymbolLocation, constructors: VariantConstructorType[]) {
        super(location, "variant");
        this.constructors = constructors;
    }


    resolve(ctx: Context) {
        // resolve constructors
        for (let constructor of this.constructors) {
            constructor.resolve(ctx);
            constructor.setParent(this);
        }
    }

    toString(): string {
        return `variant{`+this.constructors.map((c) => c.shortname()).join("|")+`}`;
    }

    shortname(): string {
        return `@variant{`+this.constructors.map((c) => c.shortname()).join("|")+`}`;
    }

    allowedNullable(): boolean {
        return true;
    }
}