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
import { FunctionPrototype } from "../other/FunctionPrototype";
import { Context } from "../symbol/Context";
import { DeclaredFFI } from "../symbol/DeclaredFFI";
import { DeclaredFunction } from "../symbol/DeclaredFunction";
import { DeclaredType } from "../symbol/DeclaredType";
import { DeclaredVariable } from "../symbol/DeclaredVariable";
import { FunctionArgument } from "../symbol/FunctionArgument";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { EnumType } from "../types/EnumType";
import { FFINamespaceType } from "../types/FFINameSpaceType";
import { InterfaceType } from "../types/InterfaceType";
import { MetaClassType, MetaEnumType, MetaInterfaceType, MetaVariantType } from "../types/MetaTypes";
import { VariantType } from "../types/VariantType";
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

        let variable = ctx.lookup(this.name);

        if(variable === null){
            throw ctx.parser.customError(`Variable ${this.name} not found`, this.location);
        }
        
        if (variable instanceof DeclaredVariable) {
            this._isVariable = true;
            this.inferredType = variable.annotation;

            // make sure hint and variable type matches

            if(hint !== null){
                let res = matchDataTypes(ctx, hint, this.inferredType!);
                if(!res.success) {
                    throw ctx.parser.customError(`Type mismatch, expected ${hint.shortname()}, got ${this.inferredType!.shortname()}`, this.location);
                }
            }

            // inherit variable constantness
            this.isConstant = variable.isConst;

            return this.inferredType!;
        }
        else if (variable instanceof DeclaredFunction) {
            let newDecl = variable.declStatement!.symbolPointer.infer(ctx, this.typeArguments);
            this.inferredType = newDecl.prototype.header;

            if(hint) {
                let res = matchDataTypes(ctx, hint, this.inferredType);
                if(!res.success) {
                    throw ctx.parser.customError(`Type mismatch, expected ${hint.shortname()}, got ${this.inferredType.shortname()}`, this.location);
                }
            }

            
            this.isConstant = false;
            return this.inferredType;
        }
        else if (variable instanceof FunctionArgument) {
            this.inferredType = variable.type;
            if(hint) {
                let res = matchDataTypes(ctx, hint, this.inferredType);
                if(!res.success) {
                    throw ctx.parser.customError(`Type mismatch, expected ${hint.shortname()}, got ${this.inferredType.shortname()}`, this.location);
                }   
            }

            this.isConstant = !variable.isMutable;
            return this.inferredType;
        }
        else if (variable instanceof DeclaredFFI){
            // we make sure we have no hint
            if(hint) {
                throw ctx.parser.customError(`Type ${hint.shortname()} is not allowed with a FFI`, this.location);
            }

            this.inferredType = new FFINamespaceType(this.location, variable);
        }
        else if (variable instanceof DeclaredType) {
            // we make sure we have no hint
            if(hint) {
                throw ctx.parser.customError(`Type ${hint.shortname()} is not allowed with a MetaType`, this.location);
            }

            /**
             * we have few types that are allowed to be used as expressions, which are:
             * 
             * - class
             * - interface
             * - variant
             * - variant cosntructor
             * - enum
             */

            if(variable.type.is(ClassType)) {
                // type arguments are not always needed, for example when accessing non-generic method from generic class
                // so we insert them but not validate them
                this.inferredType = new MetaClassType(this.location, variable.type, this.typeArguments);
                this.isConstant = false;
                
                return this.inferredType;
            }

            if(variable.type.is(InterfaceType)) {
                // no generics are allowed here, so we make sure we have none
                if(this.typeArguments.length > 0) {
                    throw ctx.parser.customError(`Interface ${variable.type.shortname()} is not allowed to have generics`, this.location);
                }
                this.inferredType = new MetaInterfaceType(this.location, variable.type);
                this.isConstant = false;
                return this.inferredType;
            }

            if(variable.type.is(EnumType)) {
                // make sure we have no generics
                if(this.typeArguments.length > 0) {
                    throw ctx.parser.customError(`Enum ${variable.type.shortname()} is not allowed to have generics`, this.location);
                }

                this.inferredType = new MetaEnumType(this.location, variable.type);
            }

            if(variable.type.is(VariantType)) {
                // generics are allowed here however
                this.inferredType = new MetaVariantType(this.location, variable.type, this.typeArguments);
                this.isConstant = false;
                return this.inferredType;
            }

        }

        throw ctx.parser.customError(`Not implemented`, this.location);

    }
}