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

import { Context } from "../symbol/Context";
import { FunctionArgument } from "../symbol/FunctionArgument";
import { Symbol } from "../symbol/Symbol";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ArrayType } from "../types/ArrayType";
import { BasicType } from "../types/BasicType";
import { BooleanType } from "../types/BooleanType";
import { ClassType } from "../types/ClassType";
import { CoroutineType } from "../types/CoroutineType";
import { DataType } from "../types/DataType";
import { EnumType } from "../types/EnumType";
import { FFINamespaceType } from "../types/FFINamespaceType";
import { FunctionType } from "../types/FunctionType";
import {
    MetaClassType,
    MetaEnumType,
    MetaVariantConstructorType,
    MetaVariantType,
} from "../types/MetaTypes";
import { NamespaceType } from "../types/NamespaceType";
import { NullableType } from "../types/NullableType";
import { PartialStructType } from "../types/PartialStruct";
import { StructType } from "../types/StructType";
import { VariantConstructorType } from "../types/VariantConstructorType";
import { VariantType } from "../types/VariantType";
import { VoidType } from "../types/VoidType";
import { BinaryExpression } from "./BinaryExpression";
import { ElementExpression } from "./ElementExpression";
import { Expression, InferenceMeta } from "./Expression";
import { ThisExpression } from "./ThisExpression";

export class MemberAccessExpression extends Expression {
    left: Expression;
    right: ElementExpression;
    isNullable: boolean = false;

    _nsAccessedSymbol: Symbol | null = null;

    constructor(
        location: SymbolLocation,
        left: Expression,
        right: ElementExpression,
        isNullable: boolean = false,
    ) {
        super(location, "member_access");
        this.left = left;
        this.right = right;
        this.isNullable = isNullable;
    }

    infer(ctx: Context, hint: DataType | null, meta?: InferenceMeta): DataType {
        //if(this.inferredType) return this.checkNullableAndReturn(ctx)
        this.setHint(hint);

        /**
         * There are many cases to consider here:
         * 1. Access of an array element, such as [].length
         * 2. Access to struct field
         * 3. Access to class field
         * 4. Access to an FFI method
         * 5. Access to VariantConstructor parameter
         * 6. Access to enum value
         * 7. Access to a class field or static field, calls are handled by the FunctionCallExpression, since
         *    Class/Interface methods are not first class citizens
         * 8. Access to an interface method
         * 9. Access to a variant constructor
         */

        // lhs has nothing to do with hint, hence we do not use it
        let lhsType = this.left.infer(ctx, null);

        if(this.isNullable){
            /**
             * ?. only allowed if (both must be true)
             * 1. LHS is nullable <- test performed here
             * 2. the outcome of LHS ?. RHS is nullable <- test performed at checkNullableAndReturn
             */
            if(!lhsType.is(ctx, NullableType)){
                ctx.parser.customError(
                    `Cannot use ?. on non-nullable type`,
                    this.location,
                );
            }
        }

        if (lhsType.is(ctx, NullableType) && !this.isNullable) {
            ctx.parser.customError(
                `Cannot access member ${this.right.name} on nullable type`,
                this.location,
            );
        }

        // case 1: array element
        if (lhsType.is(ctx, ArrayType)) {
            let arrayType = lhsType.to(ctx, ArrayType) as ArrayType;
            /**
             * Only one of the following are accepted: length, extend and slice
             */
            if (this.right.name === "length") {
                this.inferredType = new BasicType(this.location, "u64");
                this.isConstant = false;
                this.checkHint(ctx);
                return this.checkNullableAndReturn(ctx, meta)
            }

            /**
             * Extend is a function that takes new size as argument and returns void
             */
            if (this.right.name === "extend") {
                this.inferredType = new FunctionType(
                    this.location,
                    [
                        new FunctionArgument(
                            this.location,
                            "size",
                            new BasicType(this.location, "u64"),
                        ),
                    ],
                    new VoidType(this.location),
                );

                // inherit constness from lhs
                this.isConstant = this.left.isConstant;
                this.checkHint(ctx);
                return this.checkNullableAndReturn(ctx, meta)
            }

            if (this.right.name === "slice") {
                this.inferredType = new FunctionType(
                    this.location,
                    [
                        new FunctionArgument(
                            this.location,
                            "start",
                            new BasicType(this.location, "u64"),
                        ),
                        new FunctionArgument(
                            this.location,
                            "end",
                            new BasicType(this.location, "u64"),
                        ),
                    ],
                    new ArrayType(this.location, arrayType.arrayOf),
                );
                // a new array inherits the constness of the original array
                this.isConstant = this.left.isConstant;
                this.checkHint(ctx);
                return this.checkNullableAndReturn(ctx, meta)
            }

            ctx.parser.customError(
                `Invalid member access of field ${this.right.name} on array type ${arrayType.arrayOf.getShortName()}`,
                this.location,
            );
        }

        // case 2: struct field
        if (lhsType.is(ctx, StructType)) {
            let structType = lhsType.to(ctx, StructType) as StructType;

            // make sure field exists
            let field = structType.fields.find(
                (f) => f.name === this.right.name,
            );
            if (!field) {
                ctx.parser.customError(
                    `Field ${this.right.name} not found on struct ${structType.getShortName()}`,
                    this.location,
                );
            }

            this.inferredType = field.type;

            // inherit constness from lhs
            this.isConstant = this.left.isConstant;
            this.checkHint(ctx);
            return this.checkNullableAndReturn(ctx, meta)
        }
        // case 3: class field
        if (lhsType.is(ctx, ClassType)) {
            let classType = lhsType.to(ctx, ClassType) as ClassType;
            // make sure attribute
            let field = classType.attributes.find(
                (f) => f.name === this.right.name,
            );
            if (!field) {
                ctx.parser.customError(
                    `Field ${this.right.name} not found on class ${classType.getShortName()}`,
                    this.location,
                );
            }

            if(field.isStatic){
                ctx.parser.customError(`Cannot access static field ${this.right.name} on instance, Use Class name instead`, this.location);
            }

            this.inferredType = field.type;

            /**
             * The constness of a member access of a class fiel generally is OR(class is final, attribute is final)
             * But in the case where we are within a constructor and we are accessing `this` expression,
             * we set the constness to 0, to allow initialization of immutable fields
             */
            let withinConstructor = ctx.env.withinClass && ctx.getActiveMethod()?.isConstructor();
            this.isConstant = ((this.left instanceof ThisExpression) && field.isConst && withinConstructor)?0:this.right.isConstant||field.isConst;
            this.checkHint(ctx);
            return this.checkNullableAndReturn(ctx, meta)
        }

        // case 4: FFI method
        if (lhsType.is(ctx, FFINamespaceType)) {
            let ffiType = lhsType.to(ctx, FFINamespaceType) as FFINamespaceType;
            let method = ffiType.parentFFI.methods.find(
                (m) => m.imethod.name === this.right.name,
            );
            if (!method) {
                ctx.parser.customError(
                    `Method ${this.right.name} not found on FFI namespace ${ffiType.getShortName()}`,
                    this.location,
                );
            }
            this.inferredType = method;
            // ffi methods are not constant
            this.isConstant = false;
            this.checkHint(ctx);
            return this.checkNullableAndReturn(ctx, meta)
        }

        // case 5: VariantConstructor parameter
        if (lhsType.is(ctx, VariantConstructorType)) {
            let variantConstructorType = lhsType.to(
                ctx,
                VariantConstructorType,
            ) as VariantConstructorType;
            let parameter = variantConstructorType.parameters.find(
                (p) => p.name === this.right.name,
            );

            if (!parameter) {
                ctx.parser.customError(
                    `Parameter ${this.right.name} not found on variant constructor ${variantConstructorType.getShortName()}`,
                    this.location,
                );
            }

            this.inferredType = parameter.type;

            // inherit constness from lhs
            this.isConstant = this.left.isConstant;
            this.checkHint(ctx);
            return this.checkNullableAndReturn(ctx, meta)
        }

        // the rest of the cases are under MetaType
        if (lhsType.is(ctx, MetaClassType)) {
            // make sure we are accessing a static field/attribute
            let metaClassType = lhsType.to(ctx, MetaClassType) as MetaClassType;
            let classType = metaClassType.classType.to(
                ctx,
                ClassType,
            ) as ClassType;
            let field = classType.attributes.find(
                (f) => f.name === this.right.name,
            );
            if (!field) {
                ctx.parser.customError(
                    `Field ${this.right.name} not found on class ${classType.getShortName()}`,
                    this.location,
                );
            }

            if (!field.isStatic) {
                ctx.parser.customError(
                    `Field ${this.right.name} is not static`,
                    this.location,
                );
            }

            this.isConstant = field.isConst;
            // check if we are within the same class 
            if(ctx.env.withinClass && ctx.getActiveClass()?.classId === classType.classId){
                // we need to make sure that we are not in the static block
                if(ctx.env.withinClassStaticBlock){
                    // we allow the constant to be mutable within the static block
                    // as part of the static initializer
                    this.isConstant = 0;
                }
            }
            this.inferredType = field.type;
            // TODO: allow constant fields within class
            
            this.checkHint(ctx);
            return this.checkNullableAndReturn(ctx, meta)
        }

        if (lhsType.is(ctx, MetaVariantType)) {
            // make sure rhs is a valid constructor
            /**
             * For variant constructor, we have two cases that involves generics:
             * 1. The base variant has generics
             * 2. The constructor has generics
             * Generics cannot be present on both!
             *
             * For example Tree<u32>.Leaf<u32> is not allowed
             */

            let metaVariantType = lhsType.to(
                ctx,
                MetaVariantType,
            ) as MetaVariantType;
            let variantType = metaVariantType.variantType.to(
                ctx,
                VariantType,
            ) as VariantType;

            let constructor = variantType.constructors.find(
                (c) => c.name === this.right.name,
            );

            if (!constructor) {
                ctx.parser.customError(
                    `Constructor ${this.right.name} not found on variant ${variantType.getShortName()}`,
                    this.location,
                );
            }

            if (
                this.right.typeArguments.length > 0 &&
                metaVariantType.typeArguments.length > 0
            ) {
                ctx.parser.customError(
                    `Generics are not allowed on both the variant and the constructor`,
                    this.location,
                );
            }

            let typeArguments =
                this.right.typeArguments.length > 0
                    ? this.right.typeArguments
                    : metaVariantType.typeArguments;

            this.inferredType = new MetaVariantConstructorType(
                this.location,
                constructor,
                metaVariantType.genericParameters,
                typeArguments,
            );
            this.isConstant = false;
            this.checkHint(ctx);
            return this.checkNullableAndReturn(ctx, meta)
        }

        if (lhsType.is(ctx, MetaEnumType)) {
            if (this.right.typeArguments.length > 0) {
                ctx.parser.customError(
                    `Enum ${lhsType.getShortName()} is not allowed to have generics`,
                    this.location,
                );
            }

            let metaEnumType = lhsType.to(ctx, MetaEnumType) as MetaEnumType;
            let enumType = metaEnumType.enumType.to(ctx, EnumType) as EnumType;

            let value = enumType.fields.find((v) => v.name === this.right.name);
            if (!value) {
                ctx.parser.customError(
                    `Value ${this.right.name} not found on enum ${enumType.getShortName()}`,
                    this.location,
                );
            }

            this.inferredType = enumType;
            this.isConstant = false;
            this.checkHint(ctx);
            return this.checkNullableAndReturn(ctx, meta)
        }
        if(lhsType.is(ctx, CoroutineType)) {
             /**
             * Only one of the following are accepted: state, reset, finish
             */
             if (this.right.name === "state") {
                this.inferredType = new BasicType(this.location, "u8");
                this.isConstant = false;
                this.checkHint(ctx);
                return this.checkNullableAndReturn(ctx, meta)
            }

            if (this.right.name === "alive") {
                this.inferredType = new BooleanType(this.location);
                this.isConstant = false;
                this.checkHint(ctx);
                return this.checkNullableAndReturn(ctx, meta)
            }

           
           if (this.right.name === "reset" || this.right.name === "finish") {
                this.inferredType = new FunctionType(
                    this.location,
                    [],
                    new VoidType(this.location),
                );

                // inherit constness from lhs
                this.isConstant = this.left.isConstant;
                this.checkHint(ctx);
                return this.checkNullableAndReturn(ctx, meta)
            }
        }
        
        if(lhsType.is(ctx, NamespaceType)){
            if(this.isNullable){
                ctx.parser.customError(
                    `Nullable member access not allowed on namespace`,
                    this.location,
                );
            }

            let namespaceType = lhsType.to(ctx, NamespaceType) as NamespaceType;
            // find the RHS element
            let element = namespaceType.lookup(this.right.name);


            if(!element){
                ctx.parser.customError(
                    `Field ${this.right.name} not found on namespace ${namespaceType.ns.name}`,
                    this.location,
                );
            }

            if(element.isLocal){
                // check if we are allowed to access local variables
                // if we are in the the same namespace or deeper, we are allowed to access it
                if(!ctx.withinNamespace(namespaceType.ns.uid)){
                    ctx.parser.customError(`Cannot access local variable ${this.right.name} from namespace ${namespaceType.ns.name}`, this.location);
                }
            }

            this._nsAccessedSymbol = element;

            let e_expr = new ElementExpression(this.location, this.right.name, this.right.typeArguments);
            e_expr.infer(namespaceType.getContext(), hint);

            this.inferredType = e_expr.inferredType;
            this.isConstant = e_expr.isConstant;
            this.checkHint(ctx);
            return this.checkNullableAndReturn(ctx, meta)
        }

        else if (lhsType.is(ctx, PartialStructType)) {
            // first make sure we are allowed to access the field
            if (meta?.isBeingAssigned) {
                ctx.parser.customError(`Partial struct access is readonly`, this.location);
            }
                
            if(!meta?.isWithinNullishCoalescing) {
                ctx.parser.customError(`Cannot access field ${this.right.name} on partial struct ${lhsType.getShortName()} outside a nullish coalescing operator`, this.location);
            }

            let partialStructType = lhsType.to(ctx, PartialStructType) as PartialStructType;
            let structType = partialStructType.structType.to(ctx, StructType) as StructType;

            // make sure field exists
            let field = structType.fields.find(
                (f) => f.name === this.right.name,
            );
            if (!field) {
                ctx.parser.customError(
                    `Field ${this.right.name} not found on struct ${structType.getShortName()}`,
                    this.location,
                );
            }

            this.inferredType = field.type;

            // inherit constness from lhs
            this.isConstant = this.left.isConstant;
            this.checkHint(ctx);
            return this.checkNullableAndReturn(ctx, meta)
        }

        ctx.parser.customError(
            `Invalid member access of field ${this.right.name} on type ${lhsType.getShortName()}`,
            this.location,
        );
    }

    checkNullableAndReturn(ctx: Context, meta?: InferenceMeta){
        if(this.isNullable) {
            // we need to make sure that the type is nullable
            // except when we are within a nullish coalescing operator, the inferred type will not be nullable
            if(!this.inferredType?.allowedNullable(ctx) && !meta?.isWithinNullishCoalescing){
                ctx.parser.customError(`Nullable member access only usuable when the access result is nullable`, this.location)
            }

            if(!this.inferredType?.is(ctx, NullableType) && !meta?.isWithinNullishCoalescing){
                this.inferredType = new NullableType(this.location, this.inferredType!);
            }
        }

        return this.inferredType!;
    }

    clone(
        typeMap: { [key: string]: DataType },
        ctx: Context,
    ): MemberAccessExpression {
        let expr = new MemberAccessExpression(
            this.location,
            this.left.clone(typeMap, ctx),
            this.right.clone(typeMap, ctx),
            this.isNullable,
        );

        if(this.left instanceof ThisExpression) {
            /**
             * While we do remove withinImplementation when we clone the context,
             * the child context still has it set to true, so we check if we are within a class to
             */
            if(ctx.env.withinImplementation && !ctx.env.withinClass) {
                let method = ctx.getActiveImplementationMethod()
                method!.thisMemberAccessExpression.push(expr);
            }
        }

        return expr;
    }
}
