/**
 * Filename: ThisDistributedAssignExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a distributed assignment to this.
 *          this += {x, y, z} or this += {a: x, b: y, c: z}
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { BinaryExpression } from "./BinaryExpression";
import { ElementExpression } from "./ElementExpression";
import { Expression } from "./Expression";
import { MemberAccessExpression } from "./MemberAccessExpression";
import { NamedStructConstructionExpression, StructKeyValueExpressionPair } from "./NamedStructConstructionExpression";
import { ThisExpression } from "./ThisExpression";
import { UnnamedStructConstructionExpression } from "./UnnamedStructConstructionExpression";

export class ThisDistributedAssignExpression extends Expression {
    left: ThisExpression;
    right: UnnamedStructConstructionExpression | NamedStructConstructionExpression;

    constructor(location: SymbolLocation, left: ThisExpression, right: UnnamedStructConstructionExpression | NamedStructConstructionExpression) {
        super(location, "this_distributed_assign");
        this.left = left;
        this.right = right;
    }

    infer(ctx: Context, hintType: DataType): DataType {
        let lhsType = this.left.infer(ctx, hintType);

        if(!lhsType.is(ctx, ClassType)) {
            ctx.parser.customError(`Cannot use += operator with non-class type ${lhsType.shortname()}`, this.location);
        }

        let classType = lhsType.to(ctx, ClassType) as ClassType;

        // make sure that every field in the RHS struct is assignable to the class
        if(this.right instanceof UnnamedStructConstructionExpression) {
            for(let field of this.right.elements) {
                if(!(field instanceof ElementExpression)) {
                    ctx.parser.customError(`Cannot use += with non-element expression within the RHS struct.`, field.location);
                }

                let attr = classType.getAttribute(field.name);
                if(attr === null) {
                    ctx.parser.customError(`Class ${classType.shortname()} does not have an attribute named ${field.name}`, field.location);
                }

                if(attr.isStatic) {
                    ctx.parser.customError(`Cannot assign to static attribute ${field.name} of class ${classType.shortname()} using \`this\``, field.location);
                }

                let elementType = field.infer(ctx, attr.type);
            }
        }
        else {
            let structConstruction = this.right as NamedStructConstructionExpression;

            for(let field of structConstruction.fields) {
                if(!(field instanceof StructKeyValueExpressionPair)) {
                    ctx.parser.customError(`Cannot use += with non-key-value expression within the RHS struct.`, field.location);
                }

                let attr = classType.getAttribute(field.name);
                if(attr === null) {
                    ctx.parser.customError(`Class ${classType.shortname()} does not have an attribute named ${field.name}`, field.location);
                }

                if(attr.isStatic) {
                    ctx.parser.customError(`Cannot assign to static attribute ${field.name} of class ${classType.shortname()} using \`this\``, field.location);
                }

                let elementType = field.value.infer(ctx, attr.type);
            }
        }

        // `this` is not constant
        this.isConstant = false;
        return lhsType;
    }

    buildExpressions(ctx: Context): Expression[] {
        let exprs: Expression[] = [];

        if(this.right instanceof UnnamedStructConstructionExpression) {
            for(let field of this.right.elements) {
                let element = field as ElementExpression;
            // transform into a binary expression
            /**
             * this += {x, y} -> this.x = this.x + x; this.y = this.y + y;
             */
            let lhs = new MemberAccessExpression(field.location, this.left, element);
            let rhs = new BinaryExpression(field.location, lhs, field, "=");
            exprs.push(rhs);
            }
        }
        else {
            let structConstruction = this.right as NamedStructConstructionExpression;
            for(let field of structConstruction.fields) {
                let element = field as StructKeyValueExpressionPair;

                // transform into a binary expression
                /**
                 * this += {a: x, b: y} -> this.a = this.a + x; this.b = this.b + y;
                 */
                let lhs = new MemberAccessExpression(element.location, this.left, new ElementExpression(element.location, element.name));
                let rhs = new BinaryExpression(element.location, lhs, element.value, "=");
                exprs.push(rhs);
            }
        }

        return exprs;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ThisDistributedAssignExpression {
        return new ThisDistributedAssignExpression(this.location, this.left.clone(typeMap, ctx), this.right.clone(typeMap, ctx));
    }

}
