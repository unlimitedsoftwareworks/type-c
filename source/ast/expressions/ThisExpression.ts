/**
 * Filename: ThisExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a new Expression 
 *          new Array(10)
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Expression } from "./Expression";

export class ThisExpression extends Expression {
    parentClass: DataType | null = null;

    constructor(location: SymbolLocation) {
        super(location, "this");
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);
        this.isConstant = false;

        if(ctx.env.withinClass) {
            let cls = ctx.getActiveClass();
            if(!cls) {
                throw "Unreachable";
            }

            let method = ctx.findParentClassMethod();

            // we cannot use 'this' in a static method
            if(method?.imethod.isStatic) {
                throw ctx.parser.customError(`Cannot use 'this' in a static method`, this.location);
            }

            let activeMethod = ctx.getActiveMethod();
            if(activeMethod) {
                // assign this to the method
                let _this = activeMethod.codeGenProps.assignThis(cls, this.location, activeMethod.context);
                // register this as an upvalue
                ctx.registerThisAsUpvalue(_this);

            }
            else {
                throw ctx.parser.customError(`'this' can only be used within a class method`, this.location);
            }

            this.inferredType = cls;
            this.checkHint(ctx);
            return this.inferredType;
        }
        else {
            throw ctx.parser.customError(`'this' can only be used within a class or thread`, this.location);
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ThisExpression {
        return new ThisExpression(this.location);
    }
}