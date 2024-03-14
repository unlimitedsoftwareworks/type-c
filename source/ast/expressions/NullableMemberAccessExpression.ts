/**
 * Filename: NullableMemberAccessExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a nullable member access expressions.
 *          x?.y
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/typechecking";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { NullableType } from "../types/NullableType";
import { StructType } from "../types/StructType";
import { VariantConstructorType } from "../types/VariantConstructorType";
import { ElementExpression } from "./ElementExpression";
import { Expression } from "./Expression";

 export class NullableMemberAccessExpression extends Expression {
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
         * NullableMemberAccessExpression is used to access a member of a nullable type, to return either the member or null
         */

        // infer the left side
        let leftType = this.left.infer(ctx, null);

        // we have to make sure that leftType is nullable
        if(!leftType.is(NullableType)) {
            throw ctx.parser.customError(`Cannot null-access member of non-nullable type ${leftType.shortname()}`, this.location);
        }

        // get the actual type
        leftType = (leftType.to(NullableType) as NullableType).type;

        /** 
         * Only the following datatypes can be nullables:
         * 1. ClassType
         * 2. StructType
         * 3. VariantType
         * 4. VariantConstructorType
         * 5. InterfaceType
         * 6. FunctionType
         * 7. ProcessType
         */
        
        if(leftType.is(ClassType)) {
            let classType = leftType.to(ClassType) as ClassType;
            
            // check if the attribute exists
            let attribute = classType.attributes.find(a => a.name == this.right.name);
            if(!attribute) {
                throw ctx.parser.customError(`Attribute ${this.right.name} does not exist in class ${classType.shortname()}`, this.location);
            }

            // we also need to make sure that the attribute is nullable
            if(!attribute.type.allowedNullable()) {
                throw ctx.parser.customError(`Attribute ${this.right.name} is not nullable in class ${classType}`, this.location);
            }

            this.inferredType = new NullableType(this.location, attribute.type);

            this.checkHint(ctx);
            return this.inferredType;
        }

        else if (leftType.is(StructType)) {
            let structType = leftType.to(StructType) as StructType;

            // check if the field exists
            let field = structType.fields.find(f => f.name == this.right.name);
            if(!field) {
                throw ctx.parser.customError(`Field ${this.right.name} does not exist in struct ${structType.shortname()}`, this.location);
            }

            // we also need to make sure that the field is nullable
            if(!field.type.allowedNullable()) {
                throw ctx.parser.customError(`Field ${this.right.name} is not nullable in struct ${structType.shortname()}`, this.location);
            }

            this.inferredType = new NullableType(this.location, field.type);

            this.checkHint(ctx);
            return this.inferredType;
        }

        else if (leftType.is(VariantConstructorType)) {
            let variantConstructorType = leftType.to(VariantConstructorType) as VariantConstructorType;

            let parameter = variantConstructorType.parameters.find(p => p.name == this.right.name);

            if(!parameter) {
                throw ctx.parser.customError(`Parameter ${this.right.name} does not exist in variant constructor ${variantConstructorType.shortname()}`, this.location);
            }

            // we also need to make sure that the parameter can be nullable
            if(!parameter.type.allowedNullable()) {
                throw ctx.parser.customError(`Parameter ${this.right.name} is not nullable in variant constructor ${variantConstructorType.shortname()}`, this.location);
            }

            this.inferredType = new NullableType(this.location, parameter.type);

            this.checkHint(ctx);
            return this.inferredType;
        }

        throw ctx.parser.customError(`Cannot null-access member of type ${leftType.shortname()}`, this.location);
    }
}
