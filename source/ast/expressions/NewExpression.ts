/**
 * Filename: NewExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a new Expression 
 *          new Array(10)
 *     new expressions are also used to create locks
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/TypeChecking";
import { InterfaceMethod } from "../other/InterfaceMethod";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { UnsetType } from "../types/UnsetType";
import { Expression, InferenceMeta } from "./Expression";

export class NewExpression extends Expression {
    type: DataType;

    // the actual class type, since the base type can be a reference
    classType: DataType | null = null;

    // constructor arguments
    arguments: Expression[];

    // specifies if the class has an init method, or not
    _hasInitMethod: boolean = false;
    _calledInitMethod: InterfaceMethod | null = null;

    constructor(location: SymbolLocation, type: DataType, arguments_: Expression[]) {
        super(location, "new");
        this.type = type;
        this.arguments = arguments_;
    }

    infer(ctx: Context, hint: DataType | null, meta?: InferenceMeta): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        /**
         * New expression is used to spawn a new class or lock
         */
        if(this.type.is(ctx, ClassType)) {
            // now we need to find init method matching the arguments given
            let classType = this.type.to(ctx, ClassType) as ClassType;

            // TODO: first try and see if maybe only one init method exists
            let initMethod = classType.getMethodBySignature(ctx, "init", this.arguments.map(a => a.infer(ctx, null, meta)), null, []);

            if(initMethod.length === 0) {

                if(classType.methodExists(ctx, "init")){
                    ctx.parser.customError(`Class ${this.type.getShortName()} has an init method, but it does not match the expected signature`, this.location);
                }
                else {
                    if(classType.hasNonStaticAttributes()){
                        ctx.parser.customWarning(`Class ${this.type.getShortName()} has non-static attributes, but no init method. Consider adding an init method to initialize your class.`, this.location);
                    }
                }
                this._hasInitMethod = false;
                this._calledInitMethod = null;
            }
            else if(initMethod.length > 1) {
                ctx.parser.customError(`Ambiguous init method found for class ${this.type.getShortName()} with arguments ${this.arguments.map(a => a.inferredType!.getShortName()).join(", ")}`, this.location);
            }
            else {
                this._hasInitMethod = true;
                this._calledInitMethod = initMethod[0];
                // init methods are already checked for sanity whithin the ClassType class.
                // set the hint for our args
                for(let i = 0; i < this.arguments.length; i++) {
                    this.arguments[i].infer(ctx,this._calledInitMethod.header.parameters[i].type, meta);
                }
            }


            this.inferredType = this.type;
            this.isConstant = false;
            return this.inferredType;
        }
        else {
            ctx.parser.customError(`Cannot use new with type ${this.type.getShortName()}`, this.location);
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): NewExpression {
        return new NewExpression(this.location, this.type.clone(typeMap), this.arguments.map(a => a.clone(typeMap, ctx)));
    }

}