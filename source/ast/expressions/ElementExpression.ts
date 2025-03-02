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

import { Context, SymbolScope } from "../symbol/Context";
import { DeclaredFFI } from "../symbol/DeclaredFFI";
import { DeclaredFunction, DeclaredOverloadedFunction } from "../symbol/DeclaredFunction";
import { DeclaredNamespace } from "../symbol/DeclaredNamespace";
import { DeclaredType } from "../symbol/DeclaredType";
import { DeclaredVariable } from "../symbol/DeclaredVariable";
import { FunctionArgument } from "../symbol/FunctionArgument";
import { Symbol } from "../symbol/Symbol";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { VariablePattern } from "../symbol/VariablePattern";
import { BasicType } from "../types/BasicType";
import { ClassType } from "../types/ClassType";
import { DataType } from "../types/DataType";
import { EnumType } from "../types/EnumType";
import { FFINamespaceType } from "../types/FFINamespaceType";
import { FunctionType } from "../types/FunctionType";
import { InterfaceType } from "../types/InterfaceType";
import { MetaClassType, MetaEnumType, MetaInterfaceType, MetaVariantType } from "../types/MetaTypes";
import { NamespaceType } from "../types/NamespaceType";
import { VariantType } from "../types/VariantType";
import { Expression, InferenceMeta } from "./Expression";

export class ElementExpression extends Expression {
    name: string;
    
    // generics
    typeArguments: DataType[] = [];

    // inferred types of arguments, this is filled by FunctionCallExpression
    inferredArgumentsTypes: DataType[] | undefined = undefined

    // number of parameters, this is filled by FunctionCallExpression
    // -1 means not yet inferred or not even called
    numParams: number = -1;


    // reference to the function declaration, 
    // in case of calling a regular function x()
    _functionReference: DeclaredFunction | null = null;

    /**
     * Used to check if this element is a variable, which means if it can be assigned 
     * a value
     */
    _isVariable: boolean = false;
    _isFunction: boolean = false;
    _isNamespace: boolean = false;

    _scopedVar: {sym: Symbol, scope: SymbolScope} | null    = null;

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


    infer(ctx: Context, hint: DataType | null = null, meta?: InferenceMeta): DataType {
        //if (this.inferredType) return this.inferredType;
        this.setHint(hint);

        let scopedVar = ctx.lookupScope(this.name);
        this._scopedVar = scopedVar;
        
        let variable: Symbol | null = scopedVar?.sym || null;

        if(variable === null){
            ctx.parser.customError(`Variable ${this.name} not found`, this.location);
        }
        
        if (variable instanceof DeclaredVariable) {
            this._isVariable = true;
            this.inferredType = variable.annotation;

            // make sure hint and variable type matches
            // Now we check if the inferred type is a basic type so we can promote it
            if(this.inferredType!.is(ctx, BasicType) && hint && hint.is(ctx, BasicType)){
                this.checkHint(ctx, false);
            }
            else
            {
                this.checkHint(ctx);
            }
                // inherit variable constantness
            this.isConstant = variable.isConst;

            if(this.inferredType!.is(ctx, BasicType) && hint?.is(ctx, BasicType)){
                // to promote the type
                return hint;
            }
            return this.inferredType!;
        }
        else if (variable instanceof DeclaredFunction) {
            this._isFunction = true;
            /**
             * check if the function is generic and if we need type arguments
             * There are few cases:
             * 1. Function is not generic and we have type arguments: throw an error
             * 2. Function is not generic and we have no type arguments: All good!
             * 3. Function is generic and we have no type arguments: Infer the generics from usage
             * 4. Function is generic and we have type arguments: Make sure all generics are provided! partial generics are not allowed
             */

            let numParams = variable.prototype.header.parameters.length;
            if((this.numParams != -1) && (this.numParams!= numParams)) {
                ctx.parser.customError(`Function ${variable.name} expects ${numParams} parameters, but got ${this.numParams} instead`, this.location);
            }
            // case 1
            if((variable.prototype.generics.length == 0) && (this.typeArguments.length > 0)) {
                ctx.parser.customError(`Function ${variable.name} is not generic and does not expect type arguments`, this.location);
            }

            // case 2 and 3
            if(((variable.prototype.generics.length == 0) && (this.typeArguments.length == 0)) || ((variable.prototype.generics.length > 0) && (this.typeArguments.length == 0))) {
                let newDecl = variable.infer(ctx, this.typeArguments, this.inferredArgumentsTypes);
                this.inferredType = newDecl.prototype.header;
                this._functionReference = newDecl;

                this.checkHint(ctx);
                this.isConstant = false;
                return this.inferredType;
            }

            // case 4
            if((variable.prototype.generics.length > 0) && (this.typeArguments.length > 0) && (this.typeArguments.length === variable.prototype.generics.length)) {
                let newDecl = variable.infer(ctx, this.typeArguments);
                this.inferredType = newDecl.prototype.header;
                this._functionReference = newDecl;

                //variable.concreteGenerics[]

                this.checkHint(ctx);
                this.isConstant = false;
                return this.inferredType;
            }

            ctx.parser.customError(`Function expected to have ${variable.prototype.generics.length} type arguments, got ${this.typeArguments.length}`, this.location);
        }
        else if (variable instanceof FunctionArgument) {
            this.inferredType = variable.type;

            if(this.typeArguments.length > 0) {
                ctx.parser.customError(`Function argument ${variable.name} is not allowed to have generics`, this.location);
            }
            // we can promote the type here as well

            // make sure hint and variable type matches
            // Now we check if the inferred type is a basic type so we can promote it
            if(this.inferredType!.is(ctx, BasicType) && hint && hint.is(ctx, BasicType)){
                this.checkHint(ctx, false);
            }
            else
            {
                this.checkHint(ctx);
            }

            this.isConstant = !variable.isMutable;
            return this.inferredType;
        }
        else if (variable instanceof VariablePattern) {
            // we do not allow generics here
            if(this.typeArguments.length > 0) {
                ctx.parser.customError(`Variable pattern ${variable.name} is not allowed to have generics`, this.location);
            }
            this.inferredType = variable.type;


            // Now we check if the inferred type is a basic type so we can promote it
            if(this.inferredType!.is(ctx, BasicType) && hint && hint.is(ctx, BasicType)){
                this.checkHint(ctx, false);
            }
            else
            {
                this.checkHint(ctx);
            }
            
            this.isConstant = false;
            return this.inferredType;
        }
        else if (variable instanceof DeclaredFFI){
            // we make sure we have no hint
            if(hint) {
                ctx.parser.customError(`Type ${hint.getShortName()} is not allowed with a FFI`, this.location);
            }

            this.inferredType = new FFINamespaceType(this.location, variable);
            this.isConstant = false;
            this.checkHint(ctx);
            return this.inferredType;
        }
        else if (variable instanceof DeclaredNamespace) {
            this.inferredType = new NamespaceType(this.location, variable);
            this._isNamespace = true;
            //this.inferredType.resolve(ctx);
            this.isConstant = false;
            this.checkHint(ctx);
            return this.inferredType;
        }
        else if (variable instanceof DeclaredType) {
            // we make sure we have no hint
            if(hint) {
                ctx.parser.customError(`Type ${hint.getShortName()} is not allowed with a MetaType`, this.location);
            }

            if(this.typeArguments.length > 0) {
                ctx.parser.customError(`Type ${variable.name} is not allowed to have generics`, this.location);
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

            if(variable.type.is(ctx, ClassType)) {
                // type arguments are not always needed, for example when accessing non-generic method from generic class
                // so we insert them but not validate them
                this.inferredType = new MetaClassType(this.location, variable, variable.type.to(ctx, ClassType) as ClassType, variable.genericParameters, this.typeArguments);
                this.isConstant = false;
                
                return this.inferredType;
            }

            if(variable.type.is(ctx, InterfaceType)) {
                // no generics are allowed here, so we make sure we have none
                if(this.typeArguments.length > 0) {
                    ctx.parser.customError(`Interface ${variable.type.getShortName()} is not allowed to have generics`, this.location);
                }
                this.inferredType = new MetaInterfaceType(this.location, variable.type);
                this.isConstant = false;
                this.checkHint(ctx);
                return this.inferredType;
            }

            if(variable.type.is(ctx, EnumType)) {
                // make sure we have no generics
                if(this.typeArguments.length > 0) {
                    ctx.parser.customError(`Enum ${variable.type.getShortName()} is not allowed to have generics`, this.location);
                }

                this.inferredType = new MetaEnumType(this.location, variable.type);
                this.isConstant = false;
                this.checkHint(ctx);
                return this.inferredType;
            }

            if(variable.type.is(ctx, VariantType)) {
                // generics are allowed here however
                this.inferredType = new MetaVariantType(this.location, variable.type, variable.genericParameters, this.typeArguments);
                this.isConstant = false;
                this.checkHint(ctx);
                return this.inferredType;
            }
        }
        else if (variable instanceof DeclaredOverloadedFunction) {
            if (hint) {
                // make sure hint is a function type
                if (!hint.is(ctx, FunctionType)) {
                    ctx.parser.customError(`Type ${hint.getShortName()} is not allowed with an overloaded function`, this.location);
                }

                let func = variable.getFunction(hint as FunctionType, ctx);
                this.inferredType = func.prototype.header;
                this._functionReference = func;
                this.isConstant = true;
                this.checkHint(ctx);
                return this.inferredType;
            }
            else if (meta && meta.args) {
                // first see if we have one function that matches exactly the number of arguments
                let matchingFunctions = variable.getFunctionsByArity(meta.args.length);

                // avoid inferring arguments without hint
                if (matchingFunctions.length === 1) {
                    this.inferredType = matchingFunctions[0].prototype.header;
                    this._functionReference = matchingFunctions[0];
                    this.isConstant = true;
                    this.checkHint(ctx);
                    return this.inferredType;
                }

                // if we have multiple functions with the same arity, we need to infer the given arguments
                let paramTypes = meta.args.map(e => e.infer(ctx, null));

                let matchingFunction = variable.getFunctionByParams(paramTypes);
                if (!matchingFunction) {
                    ctx.parser.customError(`No function found for parameters ${paramTypes.map(p => p.toString()).join('-')}`, this.location);
                }
                this.inferredType = matchingFunction.prototype.header;
                this._functionReference = matchingFunction;
                this.isConstant = true;
                this.checkHint(ctx);
                return this.inferredType;
            }

            else {
                ctx.parser.customError(`Overloaded function ${variable.name} cannot be resolved`, this.location);
            }
        }

        ctx.parser.customError(`Not implemented`, this.location);
    }

    /**
     * Partially resolved the symbol to check if it a generic function
     * @param ctx 
     */
    isGenericFunction(ctx: Context) {
        let v = ctx.lookup(this.name);

        if(v instanceof DeclaredFunction) {
            return v.prototype.generics.length > 0;
        }
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context): ElementExpression {
        return new ElementExpression(this.location, this.name, this.typeArguments.map(t => t.clone(typeMap)));
    }
}