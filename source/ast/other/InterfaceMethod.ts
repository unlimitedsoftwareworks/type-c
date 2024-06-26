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



    static methodUIDGenerator: Map<string, number> = new Map();
    static methodUIDCounter: number = 0;

    /**
     * Generates a unique identifier for a method prototype, used by the code generator
     * @param proto 
     * @returns 
     */
    static getMethodUID(proto: FunctionPrototype){
        let uid = InterfaceMethod.methodUIDGenerator.get(proto.toString());
        if(uid == undefined){
            uid = InterfaceMethod.methodUIDCounter++;
            InterfaceMethod.methodUIDGenerator.set(proto.toString(), uid);
        }
        return uid;
    }

    constructor(location: SymbolLocation, name: string, header: FunctionType, isStatic: boolean, generics: GenericType[] = []){
        super(location, name, header, generics);
        this.isStatic = isStatic;
    }

    shortname() {
        return this.name+"("+this.header.parameters.map(p => p.isMutable?"mut ":""+p.name+": "+p.type.shortname()).join(",")+") -> "+this.header.returnType.shortname();
    }

    serialize(): string {
        return `@method{${this.name}:${this.header.serialize()},static:${this.isStatic},generics:[${this.generics.map(g => g.serialize()).join(",")}]`
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