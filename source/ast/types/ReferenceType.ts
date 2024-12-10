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
import { VariantType } from "./VariantType";
import { GenericType } from "./GenericType";
import { DeclaredNamespace } from "../symbol/DeclaredNamespace";

export class ReferenceType extends DataType{
    // package, ["ServerResponse", "Ok"]
    pkg: string[];

    // type arguments, concrete types
    typeArgs: DataType[];

    // base type
    baseType: DataType | null = null;
    baseDecl: DeclaredType | null = null;

    // used to check if the reference is a partial generic type
    // so that we do not resolve it fully
    _partialGeneric: boolean = false;

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

    resolvePartialGeneric(ctx: Context){
        this.resolve(ctx, true);
    }

    resolve(ctx: Context, partial: boolean = false) {
        if(this.preResolveRecursion()){
            return;
        }

        let initialPkg = this.pkg[0];
        let idCounter = 0;
        let fullPkg = this.pkg.join(".");

        // actual reference without namespace
        let actualReference = [...this.pkg]

        /**
         * A.B.C could resolve to A being namespace, B.C a variant for example
         * or A.B being nested namespaces, C being a type in A.B
         */



        // first we check at the first name, i.e Data.Processor
        // we first check what Data is, depending on that we check Processor
        let typeDecl = this._usageContext?.getCurrentPackage() === ctx.getCurrentPackage() ? ctx.lookup(initialPkg) : this._usageContext?.lookup(initialPkg);

        while(typeDecl instanceof DeclaredNamespace){
            actualReference.shift();
            initialPkg = actualReference[0]

            typeDecl = typeDecl.ctx.lookup(initialPkg);
        }

        if(typeDecl == null){
            ctx.parser.customError(`Type ${initialPkg} not found`, this.location);
        }

        if(!(typeDecl instanceof DeclaredType)){
            ctx.parser.customError(`Type ${initialPkg} is not a declared type`, this.location);
        }

        // in case of variant constructor, we need to keep reference to the parent type
        // so when we create a clone of a variant constructor, we clone the parent type
        // and not the variant constructor itself, then find the variant constructor
        let parentType = typeDecl.type;


        if(typeDecl == null){
            ctx.parser.customError(`Type ${fullPkg} not found`, this.location);
        }

        if(!(typeDecl instanceof DeclaredType)){
            ctx.parser.customError(`Type ${fullPkg} is not a declared type`, this.location);
        }

        // check if we have the right number of type arguments
        if(typeDecl.genericParameters.length != this.typeArgs.length){
            ctx.parser.customError(`Type ${fullPkg} requires ${typeDecl.genericParameters.length} type arguments [${typeDecl.genericParameters.map(e => e.getShortName()).join(", ")}], but got ${this.typeArgs.length}`, this.location);
        }


        if(typeDecl.genericParameters.length === 0){
            this.baseType = typeDecl.type;
            // causes infinite loop
            this.baseDecl = typeDecl;
        }
        else if (!partial){
            // we have to clone the original type
            let map = buildGenericsMaps(ctx, typeDecl.genericParameters, this.typeArgs);
            let signature = signatureFromGenerics(this.typeArgs);

            if(typeDecl.concreteTypes.has(signature)){
                // TODO: if we clone, the methods are cloned their resulting context is different form
                // the original one. Why do we clone?
                this.baseType = typeDecl.concreteTypes.get(signature)!//.clone(map);
                this.baseDecl = typeDecl;
            }
            else {
                if(parentType !== typeDecl.type){
                    let parentVariant = parentType.clone(map).to(ctx, VariantType) as VariantType;
                    // now get the constructor matching actualReference[1]
                    let constructor = parentVariant.constructors.find(c => c.name === actualReference[1]);
                    if(constructor == null){
                        ctx.parser.customError(`Variant constructor ${actualReference[1]} not found`, this.location);
                    }
                    this.baseType = constructor;
                    this.baseDecl = typeDecl;
                }
                else {
                    this.baseType = typeDecl.type.clone(map);
                    this.baseDecl = typeDecl;
                }
                //this.baseType.resolve(ctx);
                typeDecl.concreteTypes.set(signature, this.baseType);
            }
        }
        else {
            // partial generic type
            this._partialGeneric = true;
            this.baseType = typeDecl.type;
            // causes infinite loop
            this.baseDecl = typeDecl;
        }

        if(actualReference.length > 1){
            if(this.baseType.is(ctx, VariantType)){
                // return the variant with the name matches the second part of the reference
                this.baseType = (this.baseType.to(ctx,VariantType) as VariantType)?.constructors.find(c => c.name === actualReference[1])!;
                if(this.baseType == null){
                    ctx.parser.customError(`Variant constructor ${actualReference[1]} not found`, this.location);
                }
            }
        }


        this.postResolveRecursion();
    }

    dereference(): DataType {
        if(this.baseType == null){
            throw new Error("Reference type not resolved, call .resolve first (or add ctx to dereference)");
        }
        this.baseType.setOriginalType(this);
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

    getShortName(){
        return this.pkg.join(".") + (this.typeArgs.length > 0 ? "<" + this.typeArgs.map(t => t.getShortName()).join(", ") + ">" : "");
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
        this.preGenericExtractionRecursion();


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
            this.resolvePartialGeneric(ctx);
            this.baseType!.getGenericParametersRecursive(ctx, originalType, declaredGenerics, typeMap);
        }

        this.postGenericExtractionRecursion();
    }
}
