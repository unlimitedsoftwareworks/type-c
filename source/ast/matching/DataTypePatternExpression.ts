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
import { BinaryExpression } from "../expressions/BinaryExpression";
import { CastExpression } from "../expressions/CastExpression";
import { ElementExpression } from "../expressions/ElementExpression";
import { Expression } from "../expressions/Expression";
import { InstanceCheckExpression } from "../expressions/InstanceCheckExpression";
import { MemberAccessExpression } from "../expressions/MemberAccessExpression";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { EnumType } from "../types/EnumType";
import { InterfaceType } from "../types/InterfaceType";
import { ReferenceType } from "../types/ReferenceType";
import { VariantConstructorType } from "../types/VariantConstructorType";
import { VariantType } from "../types/VariantType";
import { PatternExpression } from "./PatternExpression";
import { checkSubPattern, PatternToExpression } from "./PatternUtils";

export class DataTypePatternExpression extends PatternExpression {
    type: DataType;
    args: PatternExpression[];

    constructor(location: SymbolLocation, type: DataType, args: PatternExpression[]) {
        super(location, "datatype");
        this.type = type;
        this.args = args;
    }

    infer(ctx: Context, expressionType: DataType, isConst: boolean | 0) {
        /**
         * When matching against a data type, we have to distinguish between the following cases:
         * 1. expressionType is a variant:
         *   - We expect variant constructors
         * 2. expressionType is a variant constructor:
         *  - We expect the type to be the same as the variant constructor
         * 3. expressionType is an enum:
         *  - We expect the type to be the same as the enum
         * 4. expressionType is an interface or class:
         *   - We expect the type to be either an interface or class and without any type parameters
         */
        this.type.resolve(ctx);

        if(expressionType.is(ctx, VariantType)) {
            // we expect variant constuctors
            if(!this.type.is(ctx, VariantConstructorType)) {
                ctx.parser.customError(`Cannot perform pattern matching on non-variant consturctor type ${this.type.shortname()} against a variant ${expressionType.shortname()}`, this.location);
            }

            let variantType = expressionType.to(ctx, VariantType) as VariantType;
            let variantConstructorType = this.type.to(ctx, VariantConstructorType) as VariantConstructorType;
            if(variantConstructorType._parent == null) {
                ctx.parser.customError(`Variant constructor ${variantConstructorType.shortname()} has no parent`, this.location);
            }

            let res = matchDataTypes(ctx, variantType, variantConstructorType._parent!, true);
            if(!res.success) {
                this.type.to(ctx, VariantConstructorType) as VariantConstructorType;
                ctx.parser.customError(`Cannot perform pattern matching on variant constructor ${variantConstructorType.shortname()} who is not a subtype of a variant ${variantType.shortname()}: ${res.message}`, this.location);
            }
            // we make sure that the parameters match
            if(variantConstructorType.parameters.length != this.args.length) {
                ctx.parser.customError(`Cannot perform pattern matching on variant constructor ${variantConstructorType.shortname()} with ${variantConstructorType.parameters.length} parameters against a variant ${variantType.shortname()} with ${this.args.length} arguments`, this.location);
            }

            // infer arguments
            this.args.forEach((arg, index) => {
                arg.infer(ctx, variantConstructorType.parameters[index].type, isConst);
            });
        }
        else if (expressionType.is(ctx, VariantConstructorType)) {
            // when we have a variant constructor, we expect the type to be the same as the variant constructor, because
            // matching will be performed on fields of the variant constructor
            if(!this.type.is(ctx, VariantConstructorType)) {
                ctx.parser.customError(`Cannot perform pattern matching on non-variant consturctor type ${this.type.shortname()} against a variant constructor ${expressionType.shortname()}`, this.location);
            }

            // now we make sure that the variant constructor is the same
            let r = matchDataTypes(ctx, this.type, expressionType);
            if(!r.success) {
                ctx.parser.customError(`Variant constructors missmatch, ${expressionType.shortname()} cannot be matched against ${this.type.shortname()}`, this.location);
            }

            // we make sure that the parameters match
            if((expressionType as VariantConstructorType).parameters.length != this.args.length) {
                ctx.parser.customError(`Cannot perform pattern matching on variant constructor ${expressionType.shortname()} with ${(expressionType as VariantConstructorType).parameters.length} parameters against a variant constructor ${this.type.shortname()} with ${this.args.length} arguments`, this.location);
            }

            // infer arguments
            this.args.forEach((arg, index) => {
                arg.infer(ctx, (expressionType as VariantConstructorType).parameters[index].type, isConst);
            });
        }
        else if (expressionType.is(ctx, EnumType)) {
            // when we have an enum, we expect the type to be the same as the enum, because
            // matching will be performed on fields of the enum
            if(!this.type.is(ctx, EnumType)) {
                ctx.parser.customError(`Cannot perform pattern matching on non-enum type ${this.type.shortname()} against an enum ${expressionType.shortname()}`, this.location);
            }

            // now we make sure that the enum is the same
            let r = matchDataTypes(ctx, this.type, expressionType);
            if(!r.success) {
                ctx.parser.customError(`Enums missmatch, ${expressionType.shortname()} cannot be matched against ${this.type.shortname()}`, this.location);
            }
            
            // enums take no arguments
            if(this.args.length > 0) {
                ctx.parser.customError(`Cannot perform pattern matching on enum type ${this.type.shortname()} with ${this.args.length} arguments`, this.location);
            }
        }
        else {
            // since we are not using variants at this stage, we make sure we have no arguments
            if(this.args.length > 0) {
                ctx.parser.customError(`Cannot perform pattern matching on non-variant type ${expressionType.shortname()} with ${this.args.length} arguments`, this.location);
            }

            if(!(expressionType.is(ctx, ClassType) || expressionType.is(ctx, InterfaceType))) {
                ctx.parser.customError(`Cannot perform pattern matching on type ${this.type.shortname()} against a non-matching type ${expressionType.shortname()}`, this.location);
            }

            
            // we make sure that this.type is an interface, since we cannot perform `interface is class` safely
            if(!this.type.is(ctx, InterfaceType)) {
                ctx.parser.customError(`Cannot perform pattern matching on class type ${this.type.shortname()} against a non-matching type ${expressionType.shortname()}`, this.location);
            }
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): DataTypePatternExpression{
        return new DataTypePatternExpression(this.location, this.type.clone(typeMap), this.args.map(e => e.clone(typeMap, ctx)));
    }

    generateExpression(ctx: Context, baseExpression: Expression): PatternToExpression {
        // two main cases: 1. Enum, 2. Variant/Class/Interface

        let isEnum = this.type.is(ctx, EnumType);
        
        if (isEnum) {
            // we expect X.T such as Color.Red
            if(!(this.type instanceof ReferenceType)) {
                ctx.parser.customError(`Cannot perform pattern matching on non-reference type ${this.type.shortname()}`, this.location);
            }

            let referenceType = this.type as ReferenceType;

            // make sure we have two elements, X and T
            if(referenceType.pkg.length != 2) {
                ctx.parser.customError(`Cannot perform pattern matching on just basic enum type ${this.type.shortname()}`, this.location);
            }


            return {
                condition: new BinaryExpression(
                    this.location,
                    baseExpression,
                    new MemberAccessExpression(this.location, new ElementExpression(this.location, referenceType.pkg[0]), new ElementExpression(this.location, referenceType.pkg[1])),
                    '=='
                ),
                variableAssignments: []
            }

        }


        let instanceCheck = new InstanceCheckExpression(this.location, baseExpression, this.type);
        let argsConditions: PatternToExpression[] = [];
        let thisType = this.type.dereference();

        if(thisType instanceof VariantConstructorType){
            // we fill in the args
            // ([base].name == [arg1]) && ([base].name == [arg2]) && ...
            argsConditions = this.args.map((arg, i) => {
                let memberAccessExpression = new MemberAccessExpression(
                    this.location, 
                    new CastExpression(this.location, baseExpression, thisType, "force"), 
                    new ElementExpression(this.location, (thisType as VariantConstructorType).parameters[i].name)
                );
                    
                return checkSubPattern(ctx, memberAccessExpression, arg);
            });
        }

        let conditions: Expression[] = argsConditions.map((arg, i) => {
            return arg.condition;
        }).filter((arg) => arg != null) as Expression[];

        let variables = argsConditions.map((arg, i) => {
            return arg.variableAssignments
        }).reduce((prev, curr) => {
            return curr.concat(prev);
        }, []);
        
        if(conditions.length > 0){
            // ([base] instanceof [type]) && ([base].name == [arg1]) && ([base].name == [arg2]) && ...
            let joinCondition = conditions.reduce((prev, curr) => {
                return new BinaryExpression(this.location, prev, curr, "&&");
            });

            let finalCondition = new BinaryExpression(this.location, instanceCheck, joinCondition, "&&");
            return {condition: finalCondition, variableAssignments: variables};
        }
        else {
            // ([base] instanceof [type])
            return {condition: instanceCheck, variableAssignments: variables}
        }


    }
}