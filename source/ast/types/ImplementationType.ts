/**
 * Filename: ImplementationType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an implementation type in the type-c language. Implementation is a set of methods that can be 
 *     reused by classes. They can have requirements (attributes) and methods (interfaces)
 * 
 * Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { ClassMethod } from "../other/ClassMethod";
import { ImplementationAttribute } from "../other/ImplementationAttribute";
import { ImplementationMethod } from "../other/ImplementationMethod";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType";
import { GenericType } from "./GenericType";
import { InterfaceType } from "./InterfaceType";


export class ImplementationType extends DataType {
    requiredAttributes: ImplementationAttribute[] = [];
    requiredInterface: DataType | null = null; // could be a join

    implementedMethods: ImplementationMethod[] = [];
    

    constructor(location: SymbolLocation, requiredAttributes: ImplementationAttribute[], requiredInterface: DataType | null = null, implementedMethods: ImplementationMethod[] = []) {
        super(location, "implementation");
        this.requiredAttributes = requiredAttributes;
        this.requiredInterface = requiredInterface;
        this.implementedMethods = implementedMethods;
    }

    resolve(ctx: Context) {
        if(this.requiredInterface) {
            // we make sure that the interface is resolved
            this.requiredInterface.resolve(ctx);
            if(!this.requiredInterface.is(ctx, InterfaceType)) {
                ctx.parser.customError(`Required interface ${this.requiredInterface.getShortName()} is not an interface`, this.location);
            }
        }

        this.checkAttributes(ctx);
        this.checkNoInitMethods(ctx);

        // we do not go deeper than this, further inference is done in the class type
    }


    /**
     * Copy pasta from ClassType.ts
     * Check attributes, rules:
     * 1. Static attributes cannot be generic
     * 2. Must be called `init`.
     */
    checkAttributes(ctx: Context) {
        for (const attribute of this.requiredAttributes) {
            if (attribute.name === "init") {
                ctx.parser.customError("Class attributes cannot be called `init`", attribute.location);
            }

            attribute.type.resolve(ctx);
        }
    }

    checkNoInitMethods(ctx: Context) {
        for(let method of this.implementedMethods) {
            if(method.imethod.name === "init") {
                ctx.parser.customError("Implementation methods cannot be called `init`", method.location);
            }
        }
    }

    shortname(): string {
        return `implementation ${this.requiredInterface?("for " + this.requiredInterface.getShortName()):""}(${this.requiredAttributes.map(a => a.name).join(", ")}){${this.implementedMethods.map(m => m.shortname()).join(", ")}}`
    }

    serializeCircular(): string {
        return `@impl{for{${this.requiredInterface?.serialize()}}, attrs{${this.requiredAttributes.map(a => a.serialize()).join(", ")}}, methods{${this.implementedMethods.map(m => m.serialize()).join(", ")}}}`
    }

    isAssignable(): boolean {
        return false;
    }

    clone(genericsTypeMap: { [key: string]: DataType }): ImplementationType {
        return new ImplementationType(this.location, this.requiredAttributes.map(a => a.clone(genericsTypeMap)), this.requiredInterface?.clone(genericsTypeMap) || null, this.implementedMethods.map(m => m.clone(genericsTypeMap)));
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        throw new Error("Unreachable");
    }
}
