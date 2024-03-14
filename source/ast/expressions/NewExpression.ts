/**
 * Filename: NewExpression.ts
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

import { matchDataTypes } from "../../typechecking/typechecking";
import { InterfaceMethod } from "../other/InterfaceMethod";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { ProcessType } from "../types/ProcessType";
import { Expression } from "./Expression";

export class NewExpression extends Expression {
    type: DataType;

    // the actual class type, since the base type can be a reference
    classType: DataType | null = null;

    // constructor arguments
    arguments: Expression[];

    // specifies if the class has an init method, or not
    hasInitMethod: boolean = false;
    calledInitMethod: InterfaceMethod | null = null;

    constructor(location: SymbolLocation, type: DataType, arguments_: Expression[]) {
        super(location, "new");
        this.type = type;
        this.arguments = arguments_;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        if(hint) {
            let r = matchDataTypes(ctx, hint, this.type);
            if(!r.success) {
                throw ctx.parser.customError(`Type mismatch in new expression, expected ${hint.shortname()} but found ${this.type.shortname()}: ${r.message}`, this.location);
            }
        }

        this.type.resolve(ctx);

        /**
         * New expression is used to spawn a new class or process
         */
        if(this.type.is(ctx, ClassType)) {
            // now we need to find init method matching the arguments given
            let classType = this.type.to(ctx, ClassType) as ClassType;

            let initMethod = classType.getMethodBySignature(ctx, "init", this.arguments.map(a => a.infer(ctx, null)), null);

            if(initMethod.length === 0) {
                this.hasInitMethod = false;
                this.calledInitMethod = null;
            }
            if(initMethod.length > 1) {
                throw ctx.parser.customError(`Ambiguous init method found for class ${classType.shortname()} with arguments ${this.arguments.map(a => a.inferredType!.shortname()).join(", ")}`, this.location);
            }
            else {
                this.hasInitMethod = true;
                this.calledInitMethod = initMethod[0];
                // init methods are already checked for sanity whithin the ClassType class.
                // set the hint for our args
                for(let i = 0; i < this.arguments.length; i++) {
                    this.arguments[i].setHint(this.calledInitMethod.header.parameters[i].type);
                }
            }


            this.inferredType = this.type;
            this.isConstant = false;
            return this.inferredType;
        }
        else if (this.type.is(ctx, ProcessType)) {
            throw ctx.parser.customError(`Feature is not yet implemented`, this.location);
        }
        else {
            throw ctx.parser.customError(`Cannot use new with type ${this.type.shortname()}`, this.location);
        }
    }

}