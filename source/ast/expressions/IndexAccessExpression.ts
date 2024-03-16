/**
 * Filename: IndexAccessExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an array index access
 *      x[1], x["hi", 2, 3.14]
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../symbol/SymbolLocation";
import { OperatorOverloadState } from "../other/OperatorOverloadState";
import { Expression } from "./Expression";
import { Context } from "../symbol/Context";
import { ClassType } from "../types/ClassType";
import { InterfaceType } from "../types/InterfaceType";
import { getOperatorOverloadType, isIndexable, setIndexesHint } from "../../typechecking/OperatorOverload";
import { matchDataTypes } from "../../typechecking/TypeChecking";
import { ArrayType } from "../types/ArrayType";
import { BasicType } from "../types/BasicType";
import { DataType } from "../types/DataType";

export class IndexAccessExpression extends Expression {
    lhs: Expression;
    indexes: Expression[];

    // capture the state of the operator overload, if any
    // default is not overloaded
    operatorOverloadState: OperatorOverloadState = new OperatorOverloadState();

    constructor(location: SymbolLocation, lhs: Expression, indexes: Expression[]) {
        super(location, "index_access");
        this.lhs = lhs;
        this.indexes = indexes;
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        let lhsType = this.lhs.infer(ctx, null);

        // we can apply index access to arrays and classes/interfaces
        if(lhsType.is(ctx, InterfaceType) || lhsType.is(ctx, ClassType)) {
            let lhsT = lhsType.dereference() as ClassType | InterfaceType;
            if(!isIndexable(ctx, lhsT)) {
                throw ctx.parser.customError(`Type ${lhsType.shortname()} does not support index access`, this.location);
            }

            // TODO: remove the !
            let m = getOperatorOverloadType(ctx, "__index__", lhsT, this.indexes.map((index) => index.infer(ctx, null)));
            if(m === null) {
                throw ctx.parser.customError(`Type ${lhsType.shortname()} does not support index access with signature __index__(${this.indexes.map((index) => index.infer(ctx, null).shortname()).join(", ")})`, this.location);
            }

            this.operatorOverloadState.setMethodRef(m);
            this.inferredType = setIndexesHint(ctx, m, this.indexes);
        }
        else if (lhsType.is(ctx, ArrayType)) {
            let arrayType = lhsType.to(ctx, ArrayType) as ArrayType;
            
            // make sure we have exactly one index
            if(this.indexes.length != 1) {
                throw ctx.parser.customError(`Array index access expects exactly one index, got ${this.indexes.length}`, this.location);
            }

            this.indexes[0].infer(ctx, new BasicType(this.location, "u64"));
            this.inferredType = arrayType.arrayOf;
        }
        else {
            throw ctx.parser.customError(`Type ${lhsType.shortname()} does not support index access`, this.location);
        }

        
        this.checkHint(ctx);
        this.isConstant = false;
        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): IndexAccessExpression {
        return new IndexAccessExpression(this.location, this.lhs.clone(typeMap, ctx), this.indexes.map(e => e.clone(typeMap, ctx)));
    }
}