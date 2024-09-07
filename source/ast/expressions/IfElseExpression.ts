/**
 * Filename: IfElseExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an if-else expression
 *      if x == 1 => y else z
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/TypeChecking";
import { findCompatibleTypes } from "../../typechecking/TypeInference";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { BooleanType } from "../types/BooleanType";
import { DataType } from "../types/DataType";
import { Expression } from "./Expression";

export class IfElseExpression extends Expression {
    conditions: Expression[];
    bodies: Expression[];
    elseBody: Expression;

    /**
     * A list of unique identifiers for each condition, used for conditional jumps
     * by the code generator
     */
    conditionsUIDs: string[];
    
    // static counter for the unique identifiers of the conditions labels
    static conditionsUIDCounter: number = 0;

    constructor(location: SymbolLocation, conditions: Expression[], bodies: Expression[], elseBody: Expression) {
        super(location, "if_else");
        this.conditions = conditions;
        this.bodies = bodies;
        this.elseBody = elseBody;

        this.conditionsUIDs = conditions.map(() => {
            return "iec_" + IfElseExpression.conditionsUIDCounter++;
        });
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        //if(this.inferredType) return this.inferredType;
        this.setHint(hint);

        // step 1: infer the conditions, as boolean
        this.conditions.forEach((condition) => condition.infer(ctx, null));

        // step 2: infer the expressions of each if expression
        let typesCombined: DataType[] = this.bodies.map((body) => body.infer(ctx, hint));

        // step 3: infer the else expression
        typesCombined.push(this.elseBody.infer(ctx, hint));

        // if no hint was present, we will have to infer the common type
        if(!hint) {
            let commonType = findCompatibleTypes(ctx, typesCombined);
            if(!commonType) {
                throw ctx.parser.customError(`No common type found for if-else expression inferred types: [${typesCombined.map(e => e.shortname()).join(",")}]`, this.location);
            }
            else {
                this.inferredType = commonType;
                // set the common type as hint for all expressions
                this.bodies.forEach((body) => body.setHint(commonType));
                this.elseBody.setHint(commonType);
            }
        }
        else {
            // if we have a hint, we need to make sure that the hint is compatible with all types
            for (let i = 0; i < typesCombined.length; i++) {
                let r = matchDataTypes(ctx, hint, typesCombined[i]);
                if(!r.success) {
                    throw ctx.parser.customError(`Incompatible type for condition ${i+1} expression, expected ${hint.shortname()} but ${typesCombined[i].shortname()} was found: ${r.message}`, this.location);
                }
            }

            // the hint was already set to all expressions, we do not need to reset it.
            this.inferredType = hint;
        }

        this.checkHint(ctx);
        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): IfElseExpression{
        return new IfElseExpression(this.location, this.conditions.map(e => e.clone(typeMap, ctx)), this.bodies.map(e => e.clone(typeMap, ctx)), this.elseBody.clone(typeMap, ctx));
    }
}