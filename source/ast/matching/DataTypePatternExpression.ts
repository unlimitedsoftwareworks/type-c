/**
 * Filename: DataTypePatternExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a data type pattern expression X.T()
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/TypeChecking";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { InterfaceType } from "../types/InterfaceType";
import { VariantConstructorType } from "../types/VariantConstructorType";
import { VariantType } from "../types/VariantType";
import { PatternExpression } from "./PatternExpression";

export class DataTypePatternExpression extends PatternExpression {
    type: DataType;
    args: PatternExpression[];

    constructor(location: SymbolLocation, type: DataType, args: PatternExpression[]) {
        super(location, "datatype");
        this.type = type;
        this.args = args;
    }

    infer(ctx: Context, expressionType: DataType) {
        /**
         * When matching against a data type, we have to distinguish between the following cases:
         * 1. expressionType is a variant:
         *   - We expect variant constructors
         * 2. expressionType is a variant constructor:
         *  - We expect the type to be the same as the variant constructor
         * 3. expressionType is an interface or class:
         *   - We expect the type to be either an interface or class and without any type parameters
         */

        if(expressionType.is(ctx, VariantType)) {
            // we expect variant constuctors
            if(!this.type.is(ctx, VariantConstructorType)) {
                throw ctx.parser.customError(`Cannot perform variant matching on non-variant consturctor type ${this.type.shortname()} against a variant ${expressionType.shortname()}`, this.location);
            }

            let variantType = expressionType.to(ctx, VariantType) as VariantType;
            let variantConstructorType = this.type.to(ctx, VariantConstructorType) as VariantConstructorType;

            if(variantConstructorType._parent != variantType) {
                throw ctx.parser.customError(`Cannot perform variant matching on variant constructor ${variantConstructorType.shortname()} who is not a subtype of a variant ${variantType.shortname()}`, this.location);
            }
            // we make sure that the parameters match
            if(variantConstructorType.parameters.length != this.args.length) {
                throw ctx.parser.customError(`Cannot perform variant matching on variant constructor ${variantConstructorType.shortname()} with ${variantConstructorType.parameters.length} parameters against a variant ${variantType.shortname()} with ${this.args.length} arguments`, this.location);
            }

            // infer arguments
            this.args.forEach((arg, index) => {
                arg.infer(ctx, variantConstructorType.parameters[index].type);
            });
        }
        else if (expressionType.is(ctx, VariantConstructorType)) {
            // when we have a variant constructor, we expect the type to be the same as the variant constructor, because
            // matching will be performed on fields of the variant constructor
            if(!this.type.is(ctx, VariantConstructorType)) {
                throw ctx.parser.customError(`Cannot perform variant matching on non-variant consturctor type ${this.type.shortname()} against a variant constructor ${expressionType.shortname()}`, this.location);
            }

            // now we make sure that the variant constructor is the same
            let r = matchDataTypes(ctx, this.type, expressionType);
            if(!r.success) {
                throw ctx.parser.customError(`Variant constructors missmatch, ${expressionType.shortname()} cannot be matched against ${this.type.shortname()}`, this.location);
            }

            // we make sure that the parameters match
            if((expressionType as VariantConstructorType).parameters.length != this.args.length) {
                throw ctx.parser.customError(`Cannot perform variant matching on variant constructor ${expressionType.shortname()} with ${(expressionType as VariantConstructorType).parameters.length} parameters against a variant constructor ${this.type.shortname()} with ${this.args.length} arguments`, this.location);
            }

            // infer arguments
            this.args.forEach((arg, index) => {
                arg.infer(ctx, (expressionType as VariantConstructorType).parameters[index].type);
            });
        }
        else {
            // since we are not using variants at this stage, we make sure we have no arguments
            if(this.args.length > 0) {
                throw ctx.parser.customError(`Cannot perform variant matching on non-variant type ${expressionType.shortname()} with ${this.args.length} arguments`, this.location);
            }

            if(!(expressionType.is(ctx, ClassType) || expressionType.is(ctx, InterfaceType))) {
                throw ctx.parser.customError(`Cannot perform variant matching on type ${this.type.shortname()} against a non-matching type ${expressionType.shortname()}`, this.location);
            }

            // we make sure that this.type is an interface, since we cannot perform `interface is class` safely
            if(!this.type.is(ctx, InterfaceType)) {
                throw ctx.parser.customError(`Cannot perform variant matching on class type ${this.type.shortname()} against a non-matching type ${expressionType.shortname()}`, this.location);
            }
        }
    }
}