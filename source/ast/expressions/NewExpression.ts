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
import { LockType } from "../types/LockType";
import { UnsetType } from "../types/UnsetType";
import { Expression } from "./Expression";

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

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        /**
         * When we have a lock, its type is not necessarily known, so we have to infer it
         * Hence we only infer this.type if it is not a lock
         */

        // types are resolved within matchDataTypes
        if(hint && !this.type.is(ctx, LockType)) {
            let r = matchDataTypes(ctx, hint, this.type);
            if(!r.success) {
                throw ctx.parser.customError(`Type mismatch in new expression, expected ${hint.shortname()} but found ${this.type.shortname()}: ${r.message}`, this.location);
            }
        }

        /**
         * New expression is used to spawn a new class or lock
         */
        if(this.type.is(ctx, ClassType)) {
            // now we need to find init method matching the arguments given
            let classType = this.type.to(ctx, ClassType) as ClassType;

            let initMethod = classType.getMethodBySignature(ctx, "init", this.arguments.map(a => a.infer(ctx, null)), null, []);

            if(initMethod.length === 0) {
                this._hasInitMethod = false;
                this._calledInitMethod = null;
            }
            else if(initMethod.length > 1) {
                throw ctx.parser.customError(`Ambiguous init method found for class ${classType.shortname()} with arguments ${this.arguments.map(a => a.inferredType!.shortname()).join(", ")}`, this.location);
            }
            else {
                this._hasInitMethod = true;
                this._calledInitMethod = initMethod[0];
                // init methods are already checked for sanity whithin the ClassType class.
                // set the hint for our args
                for(let i = 0; i < this.arguments.length; i++) {
                    this.arguments[i].infer(ctx,this._calledInitMethod.header.parameters[i].type);
                }
            }


            this.inferredType = this.type;
            this.isConstant = false;
            return this.inferredType;
        }
        else if (this.type.is(ctx, LockType)) {
            // syntax: new lock<T>(something of type T) or lock(something of type T), we will infer the type of the lock
            let lockType = this.type.to(ctx, LockType) as LockType;
            // make sure we have only one argument
            if(this.arguments.length !== 1) {
                throw ctx.parser.customError(`Expected one argument for lock creation, got ${this.arguments.length}`, this.location);
            }

            if(lockType.returnType.is(ctx, UnsetType)) {
                lockType.returnType = this.arguments[0].infer(ctx, null);
            }
            else {
                let r = matchDataTypes(ctx, lockType.returnType, this.arguments[0].infer(ctx, null));
                if(!r.success) {
                    throw ctx.parser.customError(`Type mismatch in lock creation, expected ${lockType.returnType.shortname()} but found ${this.arguments[0].inferredType!.shortname()}: ${r.message}`, this.location);
                }
            }

            this.inferredType = this.type;
            this.isConstant = false;
            return this.inferredType;
        }
        else {
            throw ctx.parser.customError(`Cannot use new with type ${this.type.shortname()}`, this.location);
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): NewExpression {
        return new NewExpression(this.location, this.type.clone(typeMap), this.arguments.map(a => a.clone(typeMap, ctx)));
    }

}