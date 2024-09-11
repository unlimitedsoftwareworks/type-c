/**
 * Filename: JoinType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a join of multiple interfaces,
 *        at their core, a join of interfaces is an interface duh!
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {InterfaceType} from "./InterfaceType";
import { Context } from "../symbol/Context";
import { InterfaceMethod } from "../other/InterfaceMethod";
import { GenericType } from "./GenericType";


export class JoinType extends DataType {
    left: DataType;
    right: DataType;

    methods: InterfaceMethod[] = [];
    interfaceType: InterfaceType | null = null;

    private _resolved: boolean = false;
    
    constructor(location: SymbolLocation, left: DataType, right: DataType) {
        super(location, "join");

        this.left = left;
        this.right = right;
    }

    resolve(ctx: Context){
        if(!this.left.is(ctx, InterfaceType) && !this.left.is(ctx, JoinType)){
            throw new Error("Left side of join must be either interface or join");
        }

        if(!this.right.is(ctx, InterfaceType) && !this.right.is(ctx, JoinType)){
            throw new Error("Right side of join must be either interface or join");
        }
        
        this.left.resolve(ctx);
        this.right.resolve(ctx);

        this.methods = this.flatten(ctx);

        // create a new interface type with the methods
        this.interfaceType = new InterfaceType(this.location, this.methods);
        this.interfaceType.resolve(ctx);

        this._resolved = true;
    }

    resolveIfNeeded(ctx: Context){
        if(!this._resolved){
            this.resolve(ctx);
        }
    }

    flatten(ctx: Context): InterfaceMethod[] {
        
        let leftInterface = this.left.to(ctx, InterfaceType) as InterfaceType;
        let rightInterface = this.right.to(ctx, InterfaceType) as InterfaceType;

        let methods: InterfaceMethod[] = [];

        // it is important to clone the methods, since they may be used in multiple places
        // their ID and position in the parent interface is important
        // so we should not override existing interface methods' data from different
        // structures, for example, position of the interface method in the interface
        // is set by the InterfaceType constructor, and we should not override it anywhere else
        for(let method of leftInterface.methods){
            methods.push(method.clone({}));
        }

        for(let method of rightInterface.methods){
            methods.push(method.clone({}));
        }

        return methods;
    }

    shortname(): string {
        return "join"
    }

    serialize(unpack: boolean = false): string {
        return `@join{lhs:${this.left.serialize(unpack)},rhs:${this.right.serialize(unpack)}}`
    }

    is(ctx: Context, targetType: new (...args: any[]) => DataType): boolean {
        if(targetType === JoinType) return true;
        if(targetType === InterfaceType) return true;
        return false;
    }

    to(ctx: Context, targetType: new (...args: any[]) => DataType): DataType {
        if(targetType === JoinType) return this;
        if(targetType === InterfaceType) return this.interfaceType!;
        throw new Error("Invalid cast");
    }

    allowedNullable(ctx: Context): boolean {
        return true;
    }
    
    /**
     * Returns true if the reference type has a method with the given name
     * given that the reference is either a class or an interface, otherwise false
     */
    methodExists(ctx: Context, methodName: string): boolean {
        this.resolveIfNeeded(ctx);
        return this.interfaceType!.methodExists(ctx, methodName);
    }

    clone(genericsTypeMap: {[key: string]: DataType}): JoinType{
        return new JoinType(this.location, this.left.clone(genericsTypeMap), this.right.clone(genericsTypeMap));
    }


    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // nothing to do here since joins are used as interfaces, i hope at least
    }
}