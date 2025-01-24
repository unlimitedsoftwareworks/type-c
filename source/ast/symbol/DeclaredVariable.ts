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

import { isLHSAssignable, isRHSConstSafe } from "../expressions/BinaryExpression";
import { Expression } from "../expressions/Expression";
import { NullableType } from "../types";
import { DataType } from "../types/DataType";
import { LiteralIntType } from "../types/LiteralNumberType";
import { TupleType } from "../types/TupleType";
import { VoidType } from "../types/VoidType";
import { Context } from "./Context";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";

export class DeclaredVariable extends Symbol {
    name: string;
    initializer: Expression;
    annotation: DataType | null;
    isConst: boolean;
    isStrict: boolean;

    // when declared as let x? = V
    isNullable: boolean;

    isFromTuple: boolean = false;
    isFromArray: boolean = false;
    isFromStruct: boolean = false;

    initGroupID: number = 0;

    // used to identify the index of the variable in a deconstructed expression
    indexInDeconstructedExpression = -1;
    // used to identify the field name of the variable in a deconstructed struct
    deconstructedFieldName: string | null = null;

    constructor(location: SymbolLocation, name: string, initializer: Expression, annotation: DataType | null, isConst: boolean, isLocal: boolean = false, isStrict: boolean = false, isNullable: boolean = false){
        super(location, "variable_declaration", name);
        this.name = name;
        this.initializer = initializer;
        this.annotation = annotation;
        this.isConst = isConst;
        this.isStrict = isStrict;
        this.isLocal = isLocal;
        this.isNullable = isNullable;
    }

    infer(ctx: Context){
        if(this.annotation !== null){
            this.annotation.resolve(ctx);
        }

        ctx.hideSymbol(this.name);
        let inferredType = this.initializer.infer(ctx, this.annotation);
        ctx.unhideSymbol(this.name);

        // normally this is unreachable, as the parser expects either a `:` or a `?` after identifier during var decl
        if(this.isNullable && (this.annotation !== null)){
            ctx.parser.customError("Cannot declare a nullable variable when a type hint is provided", this.location);
        }

        // handle nullable
        if(this.isNullable && inferredType.is(ctx, NullableType)){
            ctx.parser.customError("Variable initializer is already nullable, please remove the nullable hint from the variable declaration", this.location);
        }

        if(this.isNullable){
            inferredType = new NullableType(this.location, inferredType);
        }

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

        if (this.annotation instanceof TupleType) {
            ctx.parser.customError("A variable cannot be annotated or assigned a tuple type", this.location);
        }

        if(!this.isConst && this.initializer.isConstant && !isRHSConstSafe(ctx, this.initializer)){
            isRHSConstSafe(ctx, this.initializer)
            ctx.parser.customError("Cannot assign a constant expression to a non-constant variable", this.initializer.location);
        }
    }

    /**
     * Called from statements that inject variables into the context such as foreach statements
     * @param ctx 
     * @param type 
     */
    inferWithoutAssignment(ctx: Context){
        this.annotation!.resolve(ctx);
        ctx.overrideSymbol(this);
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): DeclaredVariable{
        let newVar = new DeclaredVariable(this.location, this.name, this.initializer.clone(typeMap, ctx), this.annotation?.clone(typeMap) || null, this.isConst, this.isLocal, this.isStrict);

        newVar.isFromTuple = this.isFromTuple;
        newVar.isFromArray = this.isFromArray;
        newVar.isFromStruct = this.isFromStruct;


        let sym = ctx.lookup(this.name);
        /**
         * Variable declarations are not **inserted into the context** when cloned,
         * hence we have to manually set the uid of the cloned variable to the original variable
         */
        if(sym) {
            newVar.uid = sym.uid;
        }

        return newVar;
    }

    getDescription(): string {
        return this.annotation!.kind !== "reference" ? this.annotation!.kind : this.annotation!.getShortName();
    }

    getDetails(): string {
        return this.name + ": " + this.annotation!.getShortName();
    }
}
