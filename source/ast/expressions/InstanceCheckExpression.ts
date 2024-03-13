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

import { matchDataTypes } from "../../typechecking/typechecking";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { BasicType } from "../types/BasicType";
import { BooleanType } from "../types/BooleanType";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { InterfaceType } from "../types/InterfaceType";
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

    infer(ctx: any, hint: DataType | null): DataType {
        if(this.inferredType) return this.inferredType;
        this.setHint(hint);


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

        let lhsType = this.expression.infer(ctx, hint);
        if(!(
            lhsType.is(VariantConstructorType) ||
            lhsType.is(VariantType) ||
            lhsType.is(ClassType) ||
            lhsType.is(InterfaceType)
        )) {
            throw ctx.parser.customError(`Invalid instance check on type ${lhsType.shortname()} against ${this.type.shortname()}`, this.location);
        }

        if(lhsType.is(ClassType)) {
            if(!(this.type.is(InterfaceType))) {
                throw ctx.parser.customError(`Invalid instance check on type ${lhsType.shortname()} against ${this.type.shortname()}`, this.location);
            }
        }

        if(lhsType.is(InterfaceType)) {
            if(!(this.type.is(InterfaceType) || this.type.is(ClassType))) {
                throw ctx.parser.customError(`Invalid instance check on type ${lhsType.shortname()} against ${this.type.shortname()}`, this.location);
            }
        }

        if(lhsType.is(VariantConstructorType)) {
            if(!(this.type.is(VariantType))) {
                throw ctx.parser.customError(`Invalid instance check on type ${lhsType.shortname()} against ${this.type.shortname()}`, this.location);
            }
        }

        /* unsure about this
        if(lhsType.is(VariantType)) {
            if(!(this.type.is(VariantType))) {
                throw ctx.parser.customError(`Invalid instance check on type ${lhsType.shortname()} against ${this.type.shortname()}`, this.location);
            }
        }
        */

        this.isConstant = false;
        this.inferredType = new BooleanType(this.location);

        if(hint) {
            let r = matchDataTypes(ctx, hint, this.inferredType);
            if(!r.success) {
                throw ctx.parser.customError(`Type mismatch in instance check: ${r.message}`, this.location);
            }
        }

        return this.inferredType;
    }
}