/**
 * Filename: ReverseIndexAccessExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an array reverse index access, such as x[-1].
 *      in this expression, `1` is still a u64, [-] translates to a_get_reverse_index_u64
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { OperatorOverloadState } from "../other/OperatorOverloadState";
import { Expression } from "./Expression";
import { Context } from "../symbol/Context";
import { ClassType } from "../types/ClassType";
import { InterfaceType } from "../types/InterfaceType";
import { getOperatorOverloadType, isReverseIndexable, setIndexesHint } from "../../typechecking/OperatorOverload";
import { ArrayType } from "../types/ArrayType";
import { BasicType } from "../types/BasicType";
import { DataType } from "../types/DataType";
import { NullableType } from "../types/NullableType";

export class ReverseIndexAccessExpression extends Expression {
    lhs: Expression;
    index: Expression;

    // capture the state of the operator overload, if any
    // default is not overloaded
    operatorOverloadState: OperatorOverloadState = new OperatorOverloadState();

    constructor(location: SymbolLocation, lhs: Expression, index: Expression) {
        super(location, "reverse_index_access");
        this.lhs = lhs;
        this.index = index;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        let lhsType = this.lhs.infer(ctx, null);

        if(lhsType.is(ctx, NullableType)) {
            ctx.parser.customError(`Cannot apply index access to nullable type ${lhsType.shortname()}, please denull the expression first`, this.location);
        }
            

        // we can apply index access to arrays and classes/interfaces
        if(lhsType.is(ctx, InterfaceType) || lhsType.is(ctx, ClassType)) {
            let lhsT = lhsType.dereference() as ClassType | InterfaceType;
            if(!isReverseIndexable(ctx, lhsT)) {
                ctx.parser.customError(`Type ${lhsType.shortname()} does not support index access`, this.location);
            }

            let m = getOperatorOverloadType(ctx, "__reverse_index__", lhsT, [this.index.infer(ctx, null)]);
            if(m === null) {
                ctx.parser.customError(`Type ${lhsType.shortname()} does not support index access with signature __reverse_index__(${this.index.infer(ctx, null).shortname()})`, this.location);
            }

            this.operatorOverloadState.setMethodRef(m);
            this.inferredType = setIndexesHint(ctx, m, [this.index]);
        }
        else if (lhsType.is(ctx, ArrayType)) {
            let arrayType = lhsType.to(ctx, ArrayType) as ArrayType;
            

            this.index.infer(ctx, new BasicType(this.location, "u64"));
            this.inferredType = arrayType.arrayOf;
        }
        else {
            ctx.parser.customError(`Type ${lhsType.shortname()} does not support index access`, this.location);
        }

        
        this.checkHint(ctx);
        this.isConstant = this.lhs.isConstant;
        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ReverseIndexAccessExpression {
        return new ReverseIndexAccessExpression(this.location, this.lhs.clone(typeMap, ctx), this.index.clone(typeMap, ctx));
    }
}