/**
 * Filename: MemberAccessExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models member access expressions.
 *          x.y
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/typechecking";
import { Context } from "../symbol/Context";
import { FunctionArgument } from "../symbol/FunctionArgument";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ArrayType } from "../types/ArrayType";
import { BasicType } from "../types/BasicType";
import { DataType } from "../types/DataType";
import { FFINamespaceType } from "../types/FFINameSpaceType";
import { FunctionType } from "../types/FunctionType";
import { MetaClassType, MetaEnumType, MetaVariantType } from "../types/MetaTypes";
import { StructType } from "../types/StructType";
import { VoidType } from "../types/VoidType";
import { ElementExpression } from "./ElementExpression";
import { Expression } from "./Expression";

 export class MemberAccessExpression extends Expression {
    left: Expression;
    right: ElementExpression;

    constructor(location: SymbolLocation, left: Expression, right: ElementExpression) {
        super(location, "member_access");
        this.left = left;
        this.right = right;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        if(this.inferredType) return this.inferredType;
        this.setHint(hint);
        
        /**
         * There are many cases to consider here:
         * 1. Access of an array element, such as [].length
         * 2. Access to struct field
         * 3. Access to an FFI method
         * 4. Access to enum value
         * 5. Access to a class field or method, or static field or method
         * 6. Access to an interface method
         * 7. Access to a variant constructor
         */


        // lhs has nothing to do with hint, hence we do not use it 
        let lhsType = this.left.infer(ctx);

        // case 1: array element
        if(lhsType.is(ArrayType)) {
            let arrayType = lhsType.to(ArrayType) as ArrayType;
            /**
             * Only one of the following are accepeted: length, extend and slice
             */
            if(this.right.name === "length") {
                this.inferredType = new BasicType(this.location, "u64");
                this.isConstant = false;
                return this.inferredType;
            }

            /**
             * Extend is a function that takes new size as argument and returns void
             */
            if(this.right.name === "extend") {
                this.inferredType = new FunctionType(
                    this.location,
                    [new FunctionArgument(this.location, "size", new BasicType(this.location, "u64"))],
                    new VoidType(this.location)
                );
                this.isConstant = false;
                return this.inferredType;
            }

            if(this.right.name === "slice") {
                this.inferredType = new FunctionType(
                    this.location,
                    [
                        new FunctionArgument(this.location, "start", new BasicType(this.location, "u64")),
                        new FunctionArgument(this.location, "end", new BasicType(this.location, "u64"))
                    ],
                    new ArrayType(this.location, arrayType.arrayOf)
                );
                this.isConstant = false;
                return this.inferredType;
            }

            throw ctx.parser.customError(`Invalid member access of field ${this.right.name} on array type ${arrayType.arrayOf.shortname()}`, this.location);
        }

        // case 2: struct field
        if(lhsType.is(StructType)) {
            let structType = lhsType.to(StructType) as StructType;

            // make sure field exists
            let field = structType.fields.find(f => f.name === this.right.name);
            if(!field) {
                throw ctx.parser.customError(`Field ${this.right.name} not found on struct ${structType.shortname()}`, this.location);
            }

            this.inferredType = field.type;

            if(hint) {
                let r = matchDataTypes(ctx, hint, this.inferredType);
                if(!r.success) {
                    throw ctx.parser.customError(`Type mismatch in member access, expected ${hint.shortname()} but found ${this.inferredType.shortname()}: ${r.message}`, this.location);
                }
            }

            this.isConstant = false;
            return this.inferredType;
        }
        // case 3: FFI method
        if(lhsType.is(FFINamespaceType)) {
            let ffiType = lhsType.to(FFINamespaceType) as FFINamespaceType;
            let method = ffiType.parentFFI.methods.find(m => m.imethod.name === this.right.name);
            if(!method) {
                throw ctx.parser.customError(`Method ${this.right.name} not found on FFI namespace ${ffiType.shortname()}`, this.location);
            }
            this.inferredType = method;
            this.isConstant = false;
            return this.inferredType;
        }

        // the rest of the cases are under MetaType
        if(lhsType.is(MetaClassType)) {
            // make sure we are accessing a static field/attribute
        }

        if(lhsType.is(MetaVariantType)) {
            // make sure rhs is a valid constructor
        }

        if(lhsType.is(MetaEnumType)) {
            // make sure rhs is a valid enum value
        }

        throw ctx.parser.customError(`Invalid member access of field ${this.right.name} on type ${lhsType.shortname()}`, this.location);
    }
}
