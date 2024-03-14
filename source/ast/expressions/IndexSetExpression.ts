/**
 * Filename: IndexSetExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an array index set
 *      x[1] = y, x["hi", 2, 3.14] = "woupsie"
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
import { getOperatorOverloadType, isIndexSettable, setIndexesHint, setIndexesSetHint } from "../../typechecking/OperatorOverload";
import { ArrayType } from "../types/ArrayType";
import { matchDataTypes } from "../../typechecking/typechecking";

export class IndexSetExpression extends Expression {
    lhs: Expression;
    indexes: Expression[];
    value: Expression;

    // capture the state of the operator overload, if any
    // default is not overloaded
    operatorOverloadState: OperatorOverloadState = new OperatorOverloadState();

    constructor(location: SymbolLocation, lhs: Expression, indexes: Expression[], value: Expression) {
        super(location, "index_set");
        this.lhs = lhs;
        this.indexes = indexes;
        this.value = value;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        let lhsType = this.lhs.infer(ctx, null);

        /**
         * Same as index access, index set is applicable to arrays and classes/interfaces which implement the __index_set__ method
         */

        if(lhsType.is(ctx,InterfaceType) || lhsType.is(ctx, ClassType)) {
            let lhsT = lhsType.dereference() as ClassType | InterfaceType;
            if(!isIndexSettable(ctx, lhsT)) {
                throw ctx.parser.customError(`Type ${lhsType.shortname()} does not support index set`, this.location);
            }

            // TODO: remove the !
            let m = getOperatorOverloadType(ctx, "__index_set__", lhsT, this.indexes.map((index) => index.infer(ctx, null)));
            if(m === null) {
                throw ctx.parser.customError(`Type ${lhsType.shortname()} does not support index access with signature __index_set__(${this.indexes.map((index) => index.infer(ctx, null).shortname()).join(", ")})`, this.location);
            }

            this.operatorOverloadState.setMethodRef(m);
            let valueType = this.value.infer(ctx, m.header.returnType);
            this.inferredType = setIndexesSetHint(ctx, m, this.indexes);
        }
        else if (lhsType.is(ctx, ArrayType)) {
            let arrayType = lhsType.to(ctx, ArrayType) as ArrayType;
            let valueType = this.value.infer(ctx, arrayType.arrayOf);
            this.inferredType = valueType;

            // make sure we have exactly one index
            if(this.indexes.length != 1) {
                throw ctx.parser.customError(`Array index set expects exactly one index, got ${this.indexes.length}`, this.location);
            }

            // make sure the value type matches the array type
            let res = matchDataTypes(ctx, arrayType.arrayOf, valueType);
            if(!res.success) {
                throw ctx.parser.customError(`Type mismatch in array index set: ${res.message}`, this.location);
            }
        }
        else {
            throw ctx.parser.customError(`Type ${lhsType.shortname()} does not support index set`, this.location);
        }

        this.checkHint(ctx);
        return this.inferredType;
    }
}