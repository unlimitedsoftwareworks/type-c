/**
 * Filename: DeclaredVariable.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a variable declaration expression 
 *          let x: u32 = 1
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Expression } from "../expressions/Expression";
import { BasicType } from "../types/BasicType";
import { DataType } from "../types/DataType";
import { LiteralIntType } from "../types/LiteralNumberType";
import { VoidType } from "../types/VoidType";
import { Context } from "./Context";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";

export class DeclaredVariable extends Symbol {
    name: string;
    initializer: Expression;
    annotation: DataType | null;
    isConst: boolean;
    isStrict: boolean

    constructor(location: SymbolLocation, name: string, initializer: Expression, annotation: DataType | null, isConst: boolean, isStrict: boolean){
        super(location, "variable_declaration", name);
        this.name = name;
        this.initializer = initializer;
        this.annotation = annotation;
        this.isConst = isConst;
        this.isStrict = isStrict;
    }

    infer(ctx: Context){
        if(this.annotation !== null){
            this.annotation.resolve(ctx);
        }
        
        let inferredType = this.initializer.infer(ctx, this.annotation);

        // TODO: handle strictness
        // TODO: handle constant (cannot assign constant expression to non-constant variable)

        if(this.annotation === null){
            // we need to override the new inferred type into the context
            this.annotation = inferredType;
            ctx.overrideSymbol(this);
        }

        // last sanity checks
        if(this.annotation instanceof VoidType){
            ctx.parser.customError("Cannot declare a variable of type void", this.location);
        }

        if(this.annotation instanceof LiteralIntType){
            ctx.parser.customError("Variables needs type hint, cannot infer type from number literal", this.location);
        }
    }
}