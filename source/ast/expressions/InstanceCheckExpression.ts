/**
 * Filename: InstanceCheckExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an instance check expression
 *      x is Y
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/TypeChecking";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { BasicType } from "../types/BasicType";
import { BooleanType } from "../types/BooleanType";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { InterfaceType } from "../types/InterfaceType";
import { NullType } from "../types/NullType";
import { VariantConstructorType } from "../types/VariantConstructorType";
import { VariantType } from "../types/VariantType";
import { Expression } from "./Expression";


export class InstanceCheckExpression extends Expression {
    expression: Expression;
    type: DataType;

    constructor (location: SymbolLocation, expression: Expression, type: DataType) {
        super(location, "instance_check");
        this.expression = expression;
        this.type = type;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        // resolve the type to ensure it is fully resolved
        this.type.resolve(ctx);


        /**
         * Instance checking is applicable to classes, interfaces and variants
         * Only classes and interfaces can be checked against each other. Unsupported cases result in a compile-time error
         * 
         * First two categories:
         * Class <-> Interface
         * Variant Constructor <-> Variant
         */

        /**
         * There are 3 cases of instance checking with class/interfaces
         * 1. Class is Interface
         * 2. Interface is Class
         * 3. interface is interface
         * 
         * hence we establish the following rules:
         * - lhs must be a class or interface
         * - rhs must be a class or interface
         * - if lhs is a interface, rhs must be a interface
         * 
         * Hence, our invalid cases are:
         * - lhs is class and rhs is class
         * - lhs is class and rhs is variant
         * - lhs is variant and rhs is class
         * - lhs is variant and rhs is variant
         * - lhs is variant and rhs is interface
         */

        let lhsType = this.expression.infer(ctx, null); // we use null bc lhs doesn't depend on hint
        if(!(
            lhsType.is(ctx, VariantConstructorType) ||
            lhsType.is(ctx, VariantType) ||
            lhsType.is(ctx, ClassType) ||
            lhsType.is(ctx, InterfaceType)
        )) {
            ctx.parser.customError(`Invalid instance check on type ${lhsType.getShortName()} against ${this.type.getShortName()}`, this.location);
        }

        if(lhsType.allowedNullable(ctx) && this.type.is(ctx, NullType)) {
            
        }
        else {
            if(lhsType.is(ctx, ClassType)) {
                if(!(this.type.is(ctx, InterfaceType))) {
                    ctx.parser.customError(`Invalid instance check on type ${lhsType.getShortName()} against ${this.type.getShortName()}`, this.location);
                }
            }

            if(lhsType.is(ctx, InterfaceType)) {
                if(!(this.type.is(ctx, InterfaceType) || this.type.is(ctx, ClassType))) {
                    ctx.parser.customError(`Invalid instance check on type ${lhsType.getShortName()} against ${this.type.getShortName()}`, this.location);
                }
            }

            if(lhsType.is(ctx, VariantConstructorType)) {
                if(!(this.type.is(ctx, VariantType))) {
                    ctx.parser.customError(`Invalid instance check on type ${lhsType.getShortName()} against ${this.type.getShortName()}`, this.location);
                }
            }

            /* unsure about this
            if(lhsType.is(ctx, VariantType)) {
                if(!(this.type.is(ctx, VariantType))) {
                    ctx.parser.customError(`Invalid instance check on type ${lhsType.getShortName()} against ${this.type.getShortName()}`, this.location);
                }
            }
            */
        }

        this.isConstant = false;
        this.inferredType = new BooleanType(this.location);
        this.checkHint(ctx);
        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): InstanceCheckExpression{
        return new InstanceCheckExpression(this.location, this.expression.clone(typeMap, ctx), this.type.clone(typeMap));   
    }
}