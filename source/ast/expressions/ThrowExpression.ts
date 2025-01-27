/**
 * Filename: ThrowExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2025
 *
 * Description:
 *     Models a throw expression
 *          throw("Error message", -1)
 *
 * Type-C Compiler, Copyright (c) 2023-2025 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

/**
 * A yield expression cannot be used outside of a coroutine callable function
 * Also a yield expression cannot be used alongside return statement in the same function.
 */

import { BuiltinModules } from "../../BuiltinModules";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { BasicType, UnreachableType } from "../types";
import { DataType } from "../types/DataType";
import { Expression, InferenceMeta } from "./Expression";

export class ThrowExpression extends Expression {
    message: Expression;
    code: Expression | null;
    
    constructor(location: SymbolLocation, message: Expression, code: Expression | null) {
        super(location, "throw");
        this.message = message;
        this.code = code;
    }

    infer(ctx: Context, hint: DataType | null, meta?: InferenceMeta): DataType {
        // check that message is a string
        if(BuiltinModules.String == undefined){
            ctx.parser.customError("Default String class is not defined.", this.location);
        }

        this.message.infer(ctx, BuiltinModules.String);
        this.code?.infer(ctx, new BasicType(this.location, "u32"));

        this.inferredType = new UnreachableType(this.location);
        return this.inferredType;
    }
    
    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ThrowExpression {
        let newExpression = this.message ? this.message.clone(typeMap, ctx) : null;
        let newCode = this.code ? this.code.clone(typeMap, ctx) : null;
        let newThrow = new ThrowExpression(this.location, newExpression!, newCode);
        return newThrow;
    }
}
