/**
 * Filename: CoFunctionType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a coroutine function data type
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { FunctionArgument } from "../symbol/FunctionArgument";
import { Context } from "../symbol/Context";
import { GenericType } from "./GenericType";

/*
export class CoFunctionType extends DataType {
    parameters: FunctionArgument[];
    yieldType: DataType;

    constructor(location: SymbolLocation, parameters: FunctionArgument[], yieldType: DataType) {
        super(location, "cofn");
        this.parameters = parameters;
        this.yieldType = yieldType;
    }

    resolve(ctx: Context) {
        // resolve the types of the parameters 
        this.parameters.forEach((param) => {
            param.type.resolve(ctx);
        });

        // resolve the return type
        this.yieldType.resolve(ctx);
    }

    shortname(): string {
        return "fn("+this.parameters.map((param) => (param.isMutable?"mut ":"")+param.type.shortname()).join(", ")+") -> "+this.yieldType.shortname();
    }

    serialize(unpack: boolean = false): string {
        return `@cofn{@parameters[${this.parameters.map(e => e.serialize(unpack))}],@yieldType[${this.yieldType.serialize(unpack)}]}`
    }

    clone(typeMap: {[key: string]: DataType}): CoFunctionType {
        return new CoFunctionType(this.location, this.parameters.map(p => p.clone(typeMap)), this.yieldType.clone(typeMap));
    }

    allowedNullable(ctx: Context): boolean {
        return true;
    }


    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // make sure originalType is a FunctionType
        if(!originalType.is(ctx, CoFunctionType)){
            throw ctx.parser.customError(`Expected cofunction type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
        }

        let coFunctionType = originalType.to(ctx, CoFunctionType) as CoFunctionType;
        
        // make sure the number of parameters is the same
        if(this.parameters.length != coFunctionType.parameters.length){
            throw ctx.parser.customError(`Expected ${coFunctionType.parameters.length} parameters, got ${this.parameters.length} instead.`, this.location);
        }

        // get generics for the parameters
        for(let i = 0; i < this.parameters.length; i++){
            // make sure the mutability is the same
            if(this.parameters[i].isMutable != coFunctionType.parameters[i].isMutable){
                throw ctx.parser.customError(`Expected ${coFunctionType.parameters[i].isMutable} mutability, got ${this.parameters[i].isMutable} instead.`, this.location);
            }

            this.parameters[i].type.getGenericParametersRecursive(ctx, coFunctionType.parameters[i].type, declaredGenerics, typeMap);
        }

        // get generics for the return type
        this.yieldType.getGenericParametersRecursive(ctx, coFunctionType.yieldType, declaredGenerics, typeMap);
    }
}
*/