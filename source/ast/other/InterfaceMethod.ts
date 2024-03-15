/**
 * Filename: InterfaceMethod.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an interface method, used in both classes, interfaces and FFI too,
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import {FunctionPrototype} from "./FunctionPrototype";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {GenericType} from "../types/GenericType";
import {FunctionType} from "../types/FunctionType";
import { DataType } from "../types/DataType";

export class InterfaceMethod extends FunctionPrototype {
    isStatic: boolean;

    constructor(location: SymbolLocation, name: string, header: FunctionType, isStatic: boolean, generics: GenericType[] = []){
        super(location, name, header, generics);
        this.isStatic = isStatic;
    }

    serialize(): string {
        return `@method{${this.name}:${this.header.serialize()},static:${this.isStatic}}`
    }

    /**
     * @returns true if the method is generic (has generic arguments)
     */
    isGeneric(): boolean {
        return this.generics.length > 0;
    }

    clone(typeMap: { [key: string]: DataType; }): InterfaceMethod {
        return new InterfaceMethod(this.location, this.name, this.header.clone(typeMap) as FunctionType, this.isStatic, this.generics.map(g => g.clone(typeMap)) as GenericType[]);
    }
}