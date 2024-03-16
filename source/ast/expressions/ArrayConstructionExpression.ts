/**
 * Filename: ArrayConstructionExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an expression that creates an array, such as [1, 2, 3, 4, 5]
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { findCompatibleTypes } from "../../typechecking/TypeInference";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ArrayType } from "../types/ArrayType";
import { DataType } from "../types/DataType";
import { Expression } from "./Expression";

export class ArrayConstructionExpression extends Expression {
    elements: Expression[] = [];

    constructor(location: SymbolLocation, elements: Expression[]) {
        super(location, "array_construction");
        this.elements = elements;
    }


    infer(ctx: Context, hint: DataType | null = null): DataType{
        this.setHint(hint);

        if((this.elements.length == 0) && (hint == null)){
            ctx.parser.customError("Cannot infer an empty array without hint", this.location);
        }

        if(hint && !hint.is(ctx, ArrayType)){ 
            ctx.parser.customError(`Type missmatch, ${hint.shortname()} expected, but array was found`, this.location);
        }

        let baseHint = hint?hint.to(ctx, ArrayType) as ArrayType:null;

        // infer all elements
        let elementTypes: DataType[] = [];
        for(const element of this.elements){
            elementTypes.push(element.infer(ctx, baseHint?.arrayOf || null));
        }

        // TODO:
        // make sure all elements are of the same type

        if(!baseHint){
            let commonType = findCompatibleTypes(ctx, elementTypes);
            if(commonType == null){
                ctx.parser.customError("Could not find a common type for array elements", this.location);
            }

            for(const element of this.elements){
                element.setHint(commonType);
            }
        }


        this.inferredType = new ArrayType(this.location, elementTypes[0]);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ArrayConstructionExpression{
        return new ArrayConstructionExpression(this.location, this.elements.map(e => e.clone(typeMap, ctx)));
    }
    
}
