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
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { EnumType } from "../types/EnumType";
import { FFINamespaceType } from "../types/FFINamespaceType";
import { FunctionType } from "../types/FunctionType";
import { MetaClassType, MetaEnumType, MetaVariantConstructorType, MetaVariantType } from "../types/MetaTypes";
import { StructType } from "../types/StructType";
import { VariantType } from "../types/VariantType";
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
         * 3. Access to class field
         * 4. Access to an FFI method
         * 5. Access to enum value
         * 6. Access to a class field or static field, calls are handled by the FunctionCallExpression, since 
         *    Class/Interface methods are not first class citizens
         * 7. Access to an interface method
         * 8. Access to a variant constructor
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
        // case 3: class field
        if(lhsType.is(ClassType)){
            let classType = lhsType.to(ClassType) as ClassType;
            // make sure attribute
            let field = classType.attributes.find(f => f.name === this.right.name);
            if(!field) {
                throw ctx.parser.customError(`Field ${this.right.name} not found on class ${classType.shortname()}`, this.location);
            }

            this.inferredType = field.type;
        }

        // case 4: FFI method
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
            let metaClassType = lhsType.to(MetaClassType) as MetaClassType;
            let classType = metaClassType.classType.to(ClassType) as ClassType;
            let field = classType.attributes.find(f => f.name === this.right.name);
            if(!field) {
                throw ctx.parser.customError(`Field ${this.right.name} not found on class ${classType.shortname()}`, this.location);
            }

            if(!field.isStatic) {
                throw ctx.parser.customError(`Field ${this.right.name} is not static`, this.location);
            }

            this.inferredType = field.type;
            // TODO: allow constant fields within class
            this.isConstant = false;
            return this.inferredType;
        }

        if(lhsType.is(MetaVariantType)) {
            // make sure rhs is a valid constructor
            /**
             * For variant constructor, we have two cases that involves generics:
             * 1. The base variant has generics
             * 2. The constructor has generics
             * Generics cannot be present on both!
             * 
             * For example Tree<u32>.Leaf<u32> is not allowed
             */

            let metaVariantType = lhsType.to(MetaVariantType) as MetaVariantType;
            let variantType = metaVariantType.variantType.to(VariantType) as VariantType;

            let constructor = variantType.constructors.find(c => c.name === this.right.name);

            if(!constructor) {
                throw ctx.parser.customError(`Constructor ${this.right.name} not found on variant ${variantType.shortname()}`, this.location);
            }

            if((this.right.typeArguments.length > 0) && (metaVariantType.typeArguments.length > 0)) {
                throw ctx.parser.customError(`Generics are not allowed on both the variant and the constructor`, this.location);
            }

            let typeArguments = this.right.typeArguments.length > 0 ? this.right.typeArguments : metaVariantType.typeArguments;

            this.inferredType = new MetaVariantConstructorType(this.location, constructor, typeArguments);
            this.isConstant = false;
            return this.inferredType;
        }

        if(lhsType.is(MetaEnumType)) {
            if(this.right.typeArguments.length > 0) {
                throw ctx.parser.customError(`Enum ${lhsType.shortname()} is not allowed to have generics`, this.location);
            }

            let metaEnumType = lhsType.to(MetaEnumType) as MetaEnumType;
            let enumType = metaEnumType.enumType.to(EnumType) as EnumType;

            let value = enumType.fields.find(v => v.name === this.right.name);
            if(!value) { 
                throw ctx.parser.customError(`Value ${this.right.name} not found on enum ${enumType.shortname()}`, this.location);
            }

            this.inferredType = enumType;
            this.isConstant = false;
            return this.inferredType;
        }

        throw ctx.parser.customError(`Invalid member access of field ${this.right.name} on type ${lhsType.shortname()}`, this.location);
    }
}
