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
import { GenericType } from "./GenericType";

export class VariantType extends DataType {
    constructors: VariantConstructorType[];

    constructor(location: SymbolLocation, constructors: VariantConstructorType[]) {
        super(location, "variant");
        this.constructors = constructors;

        this.constructors.forEach((c) => c.setParent(this));
        this.constructors.forEach((c, idx) => c.setId(idx));
    }


    resolve(ctx: Context) {
        if(this.preResolveRecursion()){
            return;
        }

        // resolve constructors
        for (let constructor of this.constructors) {
            constructor.resolve(ctx);
            constructor.setParent(this);
        }

        this.postResolveRecursion()
    }

    serialize(unpack: boolean = false): string {
        return `@variant{`+this.constructors.map((c) => c.serialize(unpack)).join(",")+`}`;
    }

    toString(): string {
        return `variant{`+this.constructors.map((c) => c.getShortName()).join("|")+`}`;
    }

    shortname(): string {
        return `@variant{`+this.constructors.map((c) => c.getShortName()).join("|")+`}`;
    }

    allowedNullable(ctx: Context): boolean {
        return true;
    }

    clone(genericsTypeMap: {[key: string]: DataType}){
        let newV = new VariantType(this.location, this.constructors.map((c) => c.clone(genericsTypeMap)));
        newV.constructors.forEach((c) => c.setParent(newV));
        return newV;
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        if(this.preGenericExtractionRecursion()){
            return;
        }

        // make sure originalType is a VariantType
        if(!originalType.is(ctx, VariantType)){
            ctx.parser.customError(`Expected variant type when mapping generics to types, got ${originalType.getShortName()} instead.`, this.location);
        }

        let variantType = originalType.to(ctx, VariantType) as VariantType;

        // make sure number of constructors matches
        if(this.constructors.length != variantType.constructors.length){
            ctx.parser.customError(`Expected variant with ${this.constructors.length} constructors, got ${variantType.constructors.length} instead.`, this.location);
        }

        for(let i = 0; i < this.constructors.length; i++) {
            // make sure consturctor names match
            if(this.constructors[i].name != variantType.constructors[i].name){
                ctx.parser.customError(`Expected variant constructor ${this.constructors[i].name}, got ${variantType.constructors[i].name} instead.`, this.location);
            }

            this.constructors[i].getGenericParametersRecursive(ctx, variantType.constructors[i], declaredGenerics, typeMap);
        }

        this.postGenericExtractionRecursion();
    }

    getConstructor(name: string): VariantConstructorType | null {
        for(let constructor of this.constructors) {
            if(constructor.name == name) {
                return constructor;
            }
        }
        return null;
    }
}
