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

import { matchDataTypes } from "../../typechecking/TypeChecking";
import { findCompatibleTypes } from "../../typechecking/TypeInference";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ArrayType } from "../types/ArrayType";
import { DataType } from "../types/DataType";
import { UnreachableType } from "../types/UnreachableType";
import { isRHSConstSafe } from "./BinaryExpression";
import { Expression, InferenceMeta } from "./Expression";

export class ArrayUnpackingExpression extends Expression {
    expression: Expression;

    constructor(location: SymbolLocation, expression: Expression) {
        super(location, "array_unpacking");
        this.expression = expression;
    }

    infer(ctx: Context, hint: DataType | null = null, meta?: InferenceMeta): DataType {
        this.setHint(hint);
        this.inferredType = this.expression.infer(ctx, hint?new ArrayType(this.location, hint):null, meta);
        // make sure the expression is an array
        if(!this.inferredType.is(ctx, ArrayType)){
            ctx.parser.customError(`Expected an array, but ${this.inferredType.getShortName()} found`, this.location);
        }
        let arrayType = this.inferredType.to(ctx, ArrayType) as ArrayType;
        this.inferredType = arrayType.arrayOf;
        this.checkHint(ctx);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ArrayUnpackingExpression {
        return new ArrayUnpackingExpression(this.location, this.expression.clone(typeMap, ctx));
    }
}

export class ArrayConstructionExpression extends Expression {
    elements: Expression[] = [];
    containsUnpackedArray: boolean = false;

    constructor(location: SymbolLocation, elements: Expression[]) {
        super(location, "array_construction");
        this.elements = elements;
    }


    infer(ctx: Context, hint: DataType | null = null, meta?: InferenceMeta): DataType{
        this.setHint(hint);

        if((this.elements.length == 0) && (hint == null)){
            //ctx.parser.customError("Cannot infer an empty array without hint", this.location);
            this.inferredType = new ArrayType(this.location, new UnreachableType(this.location));
            this.checkHint(ctx);
            return this.inferredType;
        }

        if(hint && !hint.is(ctx, ArrayType)){ 
            ctx.parser.customError(`Type missmatch, ${hint.getShortName()} expected, but array was found`, this.location);
        }

        let baseHint = hint?hint.to(ctx, ArrayType) as ArrayType:null;

        // infer all elements
        let elementTypes: DataType[] = [];
        let consts = []
        for(const element of this.elements){
            this.containsUnpackedArray = this.containsUnpackedArray || element instanceof ArrayUnpackingExpression;
            elementTypes.push(element.infer(ctx, baseHint?.arrayOf || null, meta));
            consts.push(element.isConstant && !isRHSConstSafe(ctx, element));
        }
        
        if(!baseHint && (elementTypes.length == 0)){
            ctx.parser.customError("Cannot infer an empty array without hint", this.location);
        }
        
        if(this.elements.length !== 0){
            let commonType = findCompatibleTypes(ctx, elementTypes);
            if(commonType == null){
                ctx.parser.customError("Could not find a common type for array elements", this.location);
            }

            if(hint) {
                let arrayHint = hint.to(ctx, ArrayType) as ArrayType;
                let baseHint = arrayHint.arrayOf;

                let res = matchDataTypes(ctx, baseHint, commonType);
                if(!res.success){
                    ctx.parser.customError(`Could not match array type ${baseHint!.getShortName()} with ${commonType.getShortName()}: ${res.message}`, this.location);
                }

                for(const element of this.elements){
                    element.setHint(baseHint);
                }
            }

            this.inferredType = new ArrayType(this.location, commonType);
        }
        else {
            this.inferredType = hint!;
        }
        
        this.isConstant = consts.some(c => c);
        this.checkHint(ctx);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ArrayConstructionExpression{
        return new ArrayConstructionExpression(this.location, this.elements.map(e => e.clone(typeMap, ctx)));
    }
    
}
