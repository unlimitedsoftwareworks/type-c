/**
 * Filename: GenericType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a generic type, which can have a constraint <T: Serializable | Comparable>
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { UnionType } from "./UnionType";
import { Context } from "../symbol/Context";
import { matchDataTypes } from "../../typechecking/TypeChecking";
import { findCompatibleTypes } from "../../typechecking/TypeInference";

export class GenericTypeConstraint {
    types: DataType[] = [];

    /**
     * @param types Possibly a union type
     */
    constructor(types: DataType | null) {
        this.types = []
        if(types instanceof UnionType) {
            this.types = types.flatten();
        }
        else if (types !== null) {
            this.types.push(types);
        }
    }


    /**
     * Checks if a given type matches the constraints
     * @param type 
     * @param scope 
     */
    checkType(ctx: Context, type: DataType): boolean {
        if(this.types.length == 0) return true;
        for(let t of this.types){
            let res = matchDataTypes(ctx, t, type);
            if(res.success) return true;
        }

        return false;
    }
}

export class GenericType extends DataType {
    name: string;
    constraint: GenericTypeConstraint;
    constructor(location: SymbolLocation, name: string, constraint: GenericTypeConstraint) {
        super(location, "generic");
        this.name = name;
        this.constraint = constraint;
    }

    resolve(ctx: Context): DataType {
        /**
         * We throw an error because resolving generic types is not supported.
         * Resolving types must occur when all types are concrete.
         */
        ctx.parser.customError("Generic type not resolved", this.location)
    }

    shortname(): string {
        return "^"+this.name;
    }

    serialize(unpack: boolean = false): string {
        return `@generic{${this.name},@constraint{${this.constraint.types.map(e => e.serialize()).join(",")}}}`
    }

    
    clone(genericsTypeMap: {[key: string]: DataType}): DataType{
        if(this.name in genericsTypeMap){
            let concreteType = genericsTypeMap[this.name];
            // make sure the concrete type matches the constraint
            if(!this.constraint.checkType(this._declContext!, concreteType)){
                throw this._declContext!.parser.customError(`Generic type ${this.name} does not match constraint`, this.location);
            }

            return concreteType;
        }
        return new GenericType(this.location, this.name, this.constraint);
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // make sure this is a declared generic
        if(!(this.name in declaredGenerics)){
            ctx.parser.customError(`Generic type ${this.name} is not declared`, this.location);
        }

        // make sure the original type matches the constraint
        if(!this.constraint.checkType(ctx, originalType)){
            ctx.parser.customError(`Generic type ${this.name} does not match constraint`, originalType.location);
        }

        if(this.name in typeMap){
            // we do not allow generics to satisfy different constraints in one instance!
            // hence we need to check if the specified type and the current type match
            let res = matchDataTypes(ctx, typeMap[this.name], originalType);
            if(!res.success){
                // Find a common type
                let commonType = findCompatibleTypes(ctx, [typeMap[this.name], originalType]);
                if(commonType === null){
                    ctx.parser.customError(`Generic type ${this.name} do not match its same instance: expected ${typeMap[this.name].shortname()}, but ${originalType.shortname()} found`, originalType.location);
                }
                else {
                    // we match the common type against the constraint of the generic type
                    if(!this.constraint.checkType(ctx, commonType)){
                        ctx.parser.customError(`Inferred generic type ${this.name}: ${commonType.shortname()} does not match constraint, found multiple different usages of generic type: ${typeMap[this.name].shortname()} and ${originalType.shortname()}`, originalType.location);
                    }
                    
                    // we update the type map
                    typeMap[this.name] = commonType;
                }
            }
        }
        else {
            typeMap[this.name] = originalType;
        } 
    }
}