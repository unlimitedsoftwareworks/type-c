/**
 * Filename: ImplementationAttribute.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models an implementation attribute
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { DataType } from "../types/DataType";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { Symbol } from "../symbol/Symbol";
import { ClassAttribute } from "./ClassAttribute";

export class ImplementationAttribute extends ClassAttribute {

    constructor(location: SymbolLocation, name: string, type: DataType, isStatic: boolean, isConst: boolean) {
        super(location, name, type, isStatic, isConst);
    }

    clone(genericsTypeMap: { [key: string]: DataType }): ImplementationAttribute {
        return super.clone(genericsTypeMap);
    }
}