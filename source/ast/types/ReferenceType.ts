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
import { buildGenericsMaps, signatureFromGenerics } from "../../typechecking/TypeInference";
import { globalTypeCache } from "../../typechecking/TypeCache";
import { EnumType } from "./EnumType";
import { VariantType } from "./VariantType";
import { GenericType } from "./GenericType";

export class ReferenceType extends DataType{
    // package, ["ServerResponse", "Ok"]
    pkg: string[];

    // type arguments, concrete types
    typeArgs: DataType[];

    // base type
    baseType: DataType | null = null;
    baseDecl: DeclaredType | null = null;

    /**
     * The context in which the reference is used (not necessarily the context in which it is declared)
     */
    protected _usageContext: Context | null = null;

    constructor(location: SymbolLocation, pkg: string[], typeArgs: DataType[] = [], usageContext: Context | null){
        super(location, "reference");
        this.pkg = pkg;
        this.typeArgs = typeArgs;

        this._usageContext = usageContext;
    }

    resolveIfNeeded(ctx: Context){
        if(this.baseType == null){
            this.resolve(ctx);
        }
    }

    resolve(ctx: Context) {
        if(globalTypeCache.isChecking(this)) {
            // TODO:double check this
            return this;
        }
        globalTypeCache.startChecking(this);

        let initialPkg = this.pkg[0];
        let fullPkg = this.pkg.join(".");

        // first we check at the first name, i.e Data.Processor
        // we first check what Data is, depending on that we check Processor
        let type = this._usageContext?.getCurrentPackage() === ctx.getCurrentPackage() ? ctx.lookup(initialPkg) : this._usageContext?.lookup(initialPkg);
        if(type == null){
            ctx.parser.customError(`Type ${initialPkg} not found`, this.location);
        }

        if(!(type instanceof DeclaredType)){
            ctx.parser.customError(`Type ${initialPkg} is not a declared type`, this.location);
        }

        // in case of variant constructor, we need to keep reference to the parent type
        // so when we create a clone of a variant constructor, we clone the parent type
        // and not the variant constructor itself, then find the variant constructor
        let parentType = type.type;

        // if variant, we look up its constructor if applicable
        if(this.pkg.length > 1){
            if(type.type.is(this._usageContext?.getCurrentPackage() === ctx.getCurrentPackage() ? ctx: this._usageContext!, VariantType)){
                type = this._usageContext?.getCurrentPackage() === ctx.getCurrentPackage() ? ctx.lookup(fullPkg) : this._usageContext?.lookup(fullPkg);
            }
        }
        
        if(type == null){
            ctx.parser.customError(`Type ${fullPkg} not found`, this.location);
        }

        if(!(type instanceof DeclaredType)){
            ctx.parser.customError(`Type ${fullPkg} is not a declared type`, this.location);
        }

        // check if we have the right number of type arguments
        if(type.genericParameters.length != this.typeArgs.length){
            ctx.parser.customError(`Type ${fullPkg} requires ${type.genericParameters.length} type arguments [${type.genericParameters.map(e => e.shortname()).join(", ")}], but got ${this.typeArgs.length}`, this.location);
        }


        if(type.genericParameters.length === 0){
            this.baseType = type.type;
            // causes infinite loop
            this.baseDecl = type;
        }
        else {
            // we have to clone the original type
            let map = buildGenericsMaps(ctx, type.genericParameters, this.typeArgs);
            let signature = signatureFromGenerics(this.typeArgs);

            if(type.concreteTypes.has(signature)){
                // TODO: if we clone, the methods are cloned their resulting context is different form 
                // the original one. Why do we clone?
                this.baseType = type.concreteTypes.get(signature)!//.clone(map);
                this.baseDecl = type;
            }
            else {
                if(parentType !== type.type){
                    let parentVariant = parentType.clone(map).to(ctx, VariantType) as VariantType;
                    // now get the constructor matching this.pkg[1]
                    let constructor = parentVariant.constructors.find(c => c.name === this.pkg[1]);
                    if(constructor == null){
                        ctx.parser.customError(`Variant constructor ${this.pkg[1]} not found`, this.location);
                    }
                    this.baseType = constructor;
                    this.baseDecl = type;
                }
                else {
                    this.baseType = type.type.clone(map);
                    this.baseDecl = type;
                }
                //this.baseType.resolve(ctx);
                type.concreteTypes.set(signature, this.baseType);
            }
        }

        //
        globalTypeCache.stopChecking(this);
        //this.baseType.resolve(ctx);
    }

    dereference(): DataType {
        if(this.baseType == null){
            throw new Error("Reference type not resolved, call .resolve first (or add ctx to dereference)");
        }
        
        // in case of a reference to a reference
        return this.baseType.dereference();
    }

    getBaseType(ctx: Context): DataType {
        if(this.baseType == null){
            this.resolveIfNeeded(ctx);
        }
        return this.baseType!;
    }

    denullReference(): DataType {
        if(this.baseType == null){
            throw new Error("Reference type not resolved, call .resolve first (or add ctx to dereference)");
        }
        
        // in case of a reference to a reference
        return this.baseType.denullReference();
    
    }

    shortname(){
        return this.pkg.join(".") + (this.typeArgs.length > 0 ? "<" + this.typeArgs.map(t => t.shortname()).join(", ") + ">" : "");
    }

    serialize(unpack: boolean = false): string {
        if(unpack){
            return this.baseType!.serialize(unpack);
        }
        else {
            return `@reference{pkg:${this.pkg.join(".")},typeArgs:${this.typeArgs.map(t => t.serialize()).join(",")}}`
        }
    }
    
    /**
     * Returns true if the reference type has a method with the given name
     * given that the reference is either a class or an interface, otherwise false
     */
    methodExists(ctx: Context, methodName: string): boolean {
        this.resolveIfNeeded(ctx);

        if(this.baseType instanceof ClassType){
            return this.baseType.methodExists(ctx, methodName);
        }
        if (this.baseType instanceof InterfaceType){
            return this.baseType.methodExists(ctx, methodName);
        }

        ctx.parser.customError("Reference is not a class neither an interface", this.location);
    }

    to(ctx: Context, targetType: new (...args: any[]) => DataType): DataType {
        this.resolveIfNeeded(ctx);
        return this.baseType!.to(ctx, targetType);
    }

    allowedNullable(ctx: Context): boolean {
        this.resolveIfNeeded(ctx);
        return this.baseType!.allowedNullable(ctx);
    }

    clone(genericsTypeMap: {[key: string]: DataType}): DataType{
        let name = this.pkg[0];
        if(name in genericsTypeMap){
            return genericsTypeMap[name];
        }
        else {
            let r = new ReferenceType(this.location, this.pkg, this.typeArgs.map(t => t.clone(genericsTypeMap)), this._usageContext);
            return r;
        }
    }


    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // there are two cases:
        // the reference itself is a generic type, in which case we add it to the list i.e T

        // or the refrence holds a generic type, in which case we add the generic type to the list. X<T>

        // or both duh!
        
        // we do not get the generic parameters of the base type, because that is specific to the reference
        // instead we only get the generic parameters of concrete typed given to this reference
        if(declaredGenerics[this.pkg[0]]){
            let generic = declaredGenerics[this.pkg[0]];
            generic.getGenericParametersRecursive(ctx, originalType, declaredGenerics, typeMap);
        }
        else {
            this.resolveIfNeeded(ctx);
            this.baseType!.getGenericParametersRecursive(ctx, originalType, declaredGenerics, typeMap);
        }
    }
}