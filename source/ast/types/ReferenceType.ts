/**
 * Filename: ReferenceType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a reference type
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { DeclaredType } from "../symbol/DeclaredType";
import { ClassType } from "./ClassType";
import { InterfaceType } from "./InterfaceType";

export class ReferenceType extends DataType{
    // package, ["ServerResponse", "Ok"]
    pkg: string[];

    // type arguments, concrete types
    typeArgs: DataType[];

    // base type
    baseType: DataType | null = null;
    baseDecl: DeclaredType | null = null;

    constructor(location: SymbolLocation, pkg: string[], typeArgs: DataType[] = []){
        super(location, "reference");
        this.pkg = pkg;
        this.typeArgs = typeArgs;
    }

    resolve(ctx: Context) {
        let fullPkg = this.pkg.join(".");

        let type = ctx.lookup(fullPkg);
        if(type == null){
            throw ctx.parser.customError(`Type ${fullPkg} not found`, this.location);
        }

        if(!(type instanceof DeclaredType)){
            throw ctx.parser.customError(`Type ${fullPkg} is not a declared type`, this.location);
        }

        // TODO: clone!
        this.baseType = type.type;
        this.baseType.resolve(ctx);
        this.baseDecl = type;
    }

    dereference(): DataType {
        if(this.baseType == null){
            throw new Error("Reference type not resolved, call .resolve first (or add ctx to dereference)");
        }
        
        // in case of a reference to a reference
        return this.baseType.dereference();
    }

    denullReference(): DataType {
        if(this.baseType == null){
            throw new Error("Reference type not resolved, call .resolve first (or add ctx to dereference)");
        }
        
        // in case of a reference to a reference
        return this.baseType.denullReference();
    
    }

    shortname(){
        return this.pkg.join(".") + (this.typeArgs.length > 0 ? "<" + this.typeArgs.map(t => t.toString()).join(", ") + ">" : "");
    }

    serialize(): string {
        return `@reference{pkg:${this.pkg.join(".")},typeArgs:${this.typeArgs.map(t => t.serialize()).join(",")}}`
    }
    
    /**
     * Returns true if the reference type has a method with the given name
     * given that the reference is either a class or an interface, otherwise false
     */
    methodExists(ctx: Context, methodName: string): boolean {
        if(this.baseType == null){
            throw new Error("Reference type not resolved, call .resolve first (or add ctx to dereference)");
        }

        if(this.baseType instanceof ClassType){
            return this.baseType.methodExists(ctx, methodName);
        }
        if (this.baseType instanceof InterfaceType){
            return this.baseType.methodExists(ctx, methodName);
        }

        throw ctx.parser.customError("Reference is not a class neither an interface", this.location);
    }

    /**
     * Returns true if the reference is std.concurrency.Promise
     */
    isPromise(ctx: Context): boolean{
        if((this.baseDecl?.name == "Promise") && (this.baseDecl.parentPackage == "~std.concurrency.Promise")){
            return true;
        }
        else if(this.baseType instanceof ReferenceType){
            return this.baseType.isPromise(ctx);
        }

        return false;
    }


    getPromiseType(ctx: Context): DataType | null {
        if((this.baseDecl?.name == "Promise") && (this.baseDecl.parentPackage == "~std.concurrency.Promise")){
            // assert we have one type argument
            if(this.typeArgs.length != 1){
                throw ctx.parser.customError("Promise type must have one type argument", this.location);
            }
            return this.typeArgs[0];
        }
        else if(this.baseType instanceof ReferenceType){
            return this.baseType.getPromiseType(ctx);
        }

        return null;
    }


    to(targetType: new (...args: any[]) => DataType): DataType {
        if(this.baseType == null){
            throw new Error("Reference type not resolved, call .resolve first (or add ctx to dereference)");
        }

        return this.baseType.to(targetType);
    }

    allowedNullable(): boolean {
        if(this.baseType == null){
            throw new Error("Reference type not resolved, call .resolve first (or add ctx to dereference)");
        }

        return this.baseType.allowedNullable();
    }
}