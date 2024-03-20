/**
 * Filename: FunctionType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models function data type
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { FunctionArgument } from "../symbol/FunctionArgument";
import { Context } from "../symbol/Context";
import { GenericType } from "./GenericType";

export class FunctionType extends DataType {
    parameters: FunctionArgument[];
    returnType: DataType;

    constructor(location: SymbolLocation, parameters: FunctionArgument[], returnType: DataType) {
        super(location, "fn");
        this.parameters = parameters;
        this.returnType = returnType;
    }

    resolve(ctx: Context) {
        // resolve the types of the parameters 
        this.parameters.forEach((param) => {
            param.type.resolve(ctx);
        });

        // resolve the return type
        this.returnType.resolve(ctx);
    }

    shortname(): string {
        return "fn("+this.parameters.map((param) => param.type.shortname()).join(", ")+") -> "+this.returnType.shortname();
    }

    serialize(): string {
        return `@fn{@parameters[${this.parameters.map(e => e.serialize())}],@returnType[${this.returnType.serialize()}]}`
    }

    clone(typeMap: {[key: string]: DataType}): FunctionType {
        return new FunctionType(this.location, this.parameters.map(p => p.clone(typeMap)), this.returnType.clone(typeMap));
    }

    allowedNullable(ctx: Context): boolean {
        return true;
    }


    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // make sure originalType is a FunctionType
        if(!originalType.is(ctx, FunctionType)){
            throw ctx.parser.customError(`Expected function type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
        }

        let functionType = originalType.to(ctx, FunctionType) as FunctionType;
        
        // make sure the number of parameters is the same
        if(this.parameters.length != functionType.parameters.length){
            throw ctx.parser.customError(`Expected ${functionType.parameters.length} parameters, got ${this.parameters.length} instead.`, this.location);
        }

        // get generics for the parameters
        for(let i = 0; i < this.parameters.length; i++){
            // make sure the mutability is the same
            if(this.parameters[i].isMutable != functionType.parameters[i].isMutable){
                throw ctx.parser.customError(`Expected ${functionType.parameters[i].isMutable} mutability, got ${this.parameters[i].isMutable} instead.`, this.location);
            }

            this.parameters[i].type.getGenericParametersRecursive(ctx, functionType.parameters[i].type, declaredGenerics, typeMap);
        }

        // get generics for the return type
        this.returnType.getGenericParametersRecursive(ctx, functionType.returnType, declaredGenerics, typeMap);
    }
}