/**
 * Filename: ReverseIndexSetExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an array reverse index set
 *      x[-1] = y, x[1, "hi", 3.14] = "woupsie"
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { OperatorOverloadState } from "../other/OperatorOverloadState";
import { Expression } from "./Expression";
import { Context } from "../symbol/Context";
import { DataType } from "../types/DataType";
import { InterfaceType } from "../types/InterfaceType";
import { ClassType } from "../types/ClassType";
import { getOperatorOverloadType, isReverseIndexSettable, setIndexesSetHint, setReverseIndexesSetHint } from "../../typechecking/OperatorOverload";
import { ArrayType } from "../types/ArrayType";
import { matchDataTypes } from "../../typechecking/TypeChecking";
import { BasicType } from "../types/BasicType";

export class ReverseIndexSetExpression extends Expression {
    lhs: Expression;
    index: Expression;
    value: Expression;

    // capture the state of the operator overload, if any
    // default is not overloaded
    operatorOverloadState: OperatorOverloadState = new OperatorOverloadState();

    constructor(location: SymbolLocation, lhs: Expression, index: Expression, value: Expression) {
        super(location, "reverse_index_set");
        this.lhs = lhs;
        this.index = index;
        this.value = value;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        let lhsType = this.lhs.infer(ctx, null);

        /**
         * Make sure we are not assigning to a constant
         */
        if(this.lhs.isConstant || !lhsType.isAssignable()) {
            ctx.parser.customError(`Cannot modify the state of a constant expression/variable`, this.location);
        }

        /**
         * Same as index access, index set is applicable to arrays and classes/interfaces which implement the __reverse_index_set__ method
         */

        if(lhsType.is(ctx,InterfaceType) || lhsType.is(ctx, ClassType)) {
            let lhsT = lhsType.dereference() as ClassType | InterfaceType;
            if(!isReverseIndexSettable(ctx, lhsT)) {
                ctx.parser.customError(`Type ${lhsType.getShortName()} does not support index set`, this.location);
            }

            let valueType = this.value.infer(ctx, null);
            let m = getOperatorOverloadType(ctx, "__reverse_index_set__", lhsT, [this.index.infer(ctx, null), valueType]);
            if(m === null) {
                ctx.parser.customError(`Type ${lhsType.getShortName()} does not support index access with signature __reverse_index_set__(${this.index.infer(ctx, null).getShortName()})`, this.location);
            }

            this.operatorOverloadState.setMethodRef(m);
            this.inferredType = setReverseIndexesSetHint(ctx, m, this.index);
            this.checkHint(ctx);
        }
        else if (lhsType.is(ctx, ArrayType)) {
            let arrayType = lhsType.to(ctx, ArrayType) as ArrayType;
            let valueType = this.value.infer(ctx, arrayType.arrayOf);
            this.inferredType = valueType;

            // make sure the value type matches the array type
            let res = matchDataTypes(ctx, arrayType.arrayOf, valueType);
            if(!res.success) {
                ctx.parser.customError(`Type mismatch in array index set: ${res.message}`, this.location);
            }

            // infer the type of the index
            let indexType = this.index.infer(ctx, null);
            if(!indexType.is(ctx, BasicType)) {
                ctx.parser.customError(`Array index must be of type int, got ${indexType.getShortName()}`, this.location);
            }
            
            let basicIndexType = indexType.to(ctx, BasicType) as BasicType;
            if(["u8", "u16", "u32", "u64"].indexOf(basicIndexType.kind) == -1) {
                ctx.parser.customError(`Array index must be of type int, got ${basicIndexType.kind}`, this.location);
            }
        }
        else {
            ctx.parser.customError(`Type ${lhsType.getShortName()} does not support index set`, this.location);
        }

        this.checkHint(ctx);
        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ReverseIndexSetExpression {
        return new ReverseIndexSetExpression(this.location, this.lhs.clone(typeMap, ctx), this.index.clone(typeMap, ctx), this.value.clone(typeMap, ctx));
    }
}