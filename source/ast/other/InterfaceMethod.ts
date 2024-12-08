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
import { ClassMethod } from "./ClassMethod";

export class InterfaceMethod extends FunctionPrototype {
    isStatic: boolean;


    /**
     * A cache of the method in case it belongs to a class method,
     * set by the ClassMethod constructor
     */
    _sourceMethod: ClassMethod | null = null;

    /**
     * The index of the method in the interface, set by the InterfaceType constructor
     */
    _indexInInterface: number = -1;


    alternativeName: string[] = [];

    static methodUIDGenerator: Map<string, number> = new Map();
    static methodUIDCounter: number = 0;

    /**
     * Generates a unique identifier for a method prototype, used by the code generator
     * @param proto 
     * @returns 
     */
    static getMethodUID(proto: FunctionPrototype){

        /*if(proto.generics.length > 0){
            throw new Error("Cannot generate UID for generic method prototype");
        }*/
        
        // TODO: double check this, might cause issues with types that are not unpacked, i.e String vs {class ....}
        let serial = proto.serialize(false)
        let uid = InterfaceMethod.methodUIDGenerator.get(serial);
        if(uid == undefined){
            uid = InterfaceMethod.methodUIDCounter++;
            InterfaceMethod.methodUIDGenerator.set(serial, uid);
        }
        return uid;
    }

    constructor(location: SymbolLocation, name: string, header: FunctionType, isStatic: boolean, generics: GenericType[] = []){
        super(location, name, header, generics);
        this.isStatic = isStatic;
    }

    addAlternativeName(name: string) {
        this.alternativeName.push(name);
    }

    getShortName() {
        return this.name+"("+this.header.parameters.map(p => p.isMutable?"mut ":""+p.name+": "+p.type.getShortName()).join(",")+") -> "+this.header.returnType.getShortName();
    }

    serialize(unpack: boolean = false): string {
        return `@method{${this.name}:${this.header.serialize(unpack)},static:${this.isStatic},generics:[${this.generics.map(g => g.serialize(unpack)).join(",")}]`
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

    getUID(): number {
        return InterfaceMethod.getMethodUID(this);
    }
}