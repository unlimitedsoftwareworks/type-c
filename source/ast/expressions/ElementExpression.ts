/**
 * Filename: ElementExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an element, such as `x`
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { matchDataTypes } from "../../typechecking/typechecking";
import { Context } from "../symbol/Context";
import { DeclaredVariable } from "../symbol/DeclaredVariable";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Expression } from "./Expression";

export class ElementExpression extends Expression {
    name: string;
    
    // generics
    typeArguments: DataType[] = [];

    /**
     * Used to check if this element is a variable, which means if it can be assigned 
     * a value
     */
    private _isVariable: boolean = false;

    constructor(location: SymbolLocation, name: string, typeArguments: DataType[] = []) {
        super(location, "element");
        this.name = name;
        this.typeArguments = typeArguments;
    }


    /**
     * Set the variable state of this element
     */
    isVariable(): boolean {
        return this._isVariable;
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        if (this.inferredType) return this.inferredType;
        this.setHint(hint);

        let variable = ctx.lookupScope(this.name);

        if(variable === null){
            throw ctx.parser.customError(`Variable ${this.name} not found`, this.location);
        }

        else {
            console.log(variable)
        }

        
        if (variable.sym instanceof DeclaredVariable) {
            this._isVariable = true;
            this.inferredType = variable.sym.annotation;

            // make sure hint and variable type matches

            if(hint !== null){
                let res = matchDataTypes(ctx, hint, this.inferredType!);
                if(!res.success) {
                    throw ctx.parser.customError(`Type mismatch, expected ${hint.shortname()}, got ${this.inferredType!.shortname()}`, this.location);
                }
            }

            // inherit variable constantness
            this.isConstant = variable.sym.isConst;

            return this.inferredType!;
        }

        throw ctx.parser.customError(`Element ${this.name} is not a variable`, this.location);

    }
}