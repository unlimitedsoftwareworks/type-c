/**
 * Filename: JoinType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a join of multiple interfaces,
 *        at their core, a join of interfaces is an interface duh!
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {InterfaceType} from "./InterfaceType";
import { Context } from "../symbol/Context";
import { InterfaceMethod } from "../other/InterfaceMethod";
import { GenericType } from "./GenericType";
import { StructField, StructType } from "./StructType";
import { areSignaturesIdentical, matchDataTypes, reduceStructFields } from "../../typechecking/TypeChecking";


export class JoinType extends DataType {
    left: DataType;
    right: DataType;

    resolvedTypeCategory: "interface" | "struct" | null = null;
    interfaceType: InterfaceType | null = null;
    structType: StructType | null = null;


    private _resolved: boolean = false;

    constructor(location: SymbolLocation, left: DataType, right: DataType) {
        super(location, "join");

        this.left = left;
        this.right = right;
    }

    resolve(ctx: Context){
        if(this.preResolveRecursion()){
            return;
        }

        this.left.resolve(ctx);
        this.right.resolve(ctx);

        if(this.left.is(ctx, InterfaceType)){
            // make sure the right side is an interface
            if(!this.right.is(ctx, InterfaceType)){
                ctx.parser.customError("Attempting to join lhs interface with rhs " + this.right.getShortName() + " instead.", this.location);
            }
            this.resolveInterface(ctx);
            this.resolvedTypeCategory = "interface";
        }

        else if(this.right.is(ctx, StructType)){
            // make sure the left side is an interface
            if(!this.left.is(ctx, StructType)){
                ctx.parser.customError("Attempting to join rhs struct with lhs " + this.left.getShortName() + " instead.", this.location);
            }
            this.resolveStruct(ctx);
            this.resolvedTypeCategory = "struct";
        }
        else {
            ctx.parser.customError("Invalid join of lhs " + this.left.getShortName() + " with rhs " + this.right.getShortName() + ".", this.location);
        }


        this._resolved = true;

        this.postResolveRecursion()
    }

    resolveIfNeeded(ctx: Context){
        if(!this._resolved){
            this.resolve(ctx);
        }
    }

    resolveInterface(ctx: Context){
        const methods = this.flattenInterface(ctx);
        // create a new interface type with the methods
        this.interfaceType = new InterfaceType(this.location, methods);
        this.interfaceType.resolve(ctx);
    }

    flattenInterface(ctx: Context): InterfaceMethod[] {
        let leftInterface = this.left.to(ctx, InterfaceType) as InterfaceType;
        let rightInterface = this.right.to(ctx, InterfaceType) as InterfaceType;

        let methods: InterfaceMethod[] = [];

        // it is important to clone the methods, since they may be used in multiple places
        // their ID and position in the parent interface is important
        // so we should not override existing interface methods' data from different
        // structures, for example, position of the interface method in the interface
        // is set by the InterfaceType constructor, and we should not override it anywhere else
        for(let method of leftInterface.methods){
            methods.push(method.clone({}));
        }

        for(let method of rightInterface.methods){
            let ignore = false;
            for( const m of methods ){
                
                if(m.name === method.name){
                    // check if the signatures are the same
                    if(areSignaturesIdentical(ctx, m, method)){
                        ignore = true;
                        break;
                    }
                }
            }

            if(!ignore){
                methods.push(method.clone({}));
            }
        }

        return methods;
    }

    resolveStruct(ctx: Context){
        const fields = this.flattenStruct(ctx);
        // create a new struct type with the fields
        this.structType = new StructType(this.location, fields);
        this.structType.resolve(ctx);
    }

    flattenStruct(ctx: Context): StructField[] {
        let leftStruct = this.left.to(ctx, StructType) as StructType;
        let rightStruct = this.right.to(ctx, StructType) as StructType;

        let fields: StructField[] = [];

        for(let field of leftStruct.fields){
            fields.push(field.clone({}));
        }

        for(let field of rightStruct.fields){
            // make sure the field is not already in the list
            fields.push(field.clone({}));
        }

        let res = reduceStructFields(ctx, fields, true, []);
        if(!res.err.success){
            ctx.parser.customError(`Incompatible duplicate field in join structs: ${res.err.message}`, this.location);
        }

        return res.fields;
    }

    shortname(): string {
        return "join"
    }

    serializeCircular(): string {
        if(this.resolvedTypeCategory === "interface"){
            return this.interfaceType!.serializeCircular();
        }
        else if(this.resolvedTypeCategory === "struct"){
            return this.structType!.serializeCircular();
        }
        throw new Error("Join type not resolved, call .resolve first");
    }

    is(ctx: Context, targetType: new (...args: any[]) => DataType): boolean {
        if(targetType === JoinType) return true;
        if((targetType === InterfaceType) && this.resolvedTypeCategory === "interface") return true;
        if((targetType === StructType) && this.resolvedTypeCategory === "struct") return true;
        return false;
    }

    to(ctx: Context, targetType: new (...args: any[]) => DataType): DataType {
        if(targetType === JoinType) return this;
        if((targetType === InterfaceType) && this.resolvedTypeCategory === "interface") return this.interfaceType!;
        if((targetType === StructType) && this.resolvedTypeCategory === "struct") return this.structType!;
        throw new Error("Invalid cast");
    }

    allowedNullable(ctx: Context): boolean {
        return true;
    }


    clone(genericsTypeMap: {[key: string]: DataType}): JoinType{
        return new JoinType(this.location, this.left.clone(genericsTypeMap), this.right.clone(genericsTypeMap));
    }


    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // nothing to do here since joins are used as interfaces, i hope at least
        if(this.resolvedTypeCategory === "interface"){
            this.interfaceType!.getGenericParametersRecursive(ctx, originalType, declaredGenerics, typeMap);
        }
        else if(this.resolvedTypeCategory === "struct"){
            this.structType!.getGenericParametersRecursive(ctx, originalType, declaredGenerics, typeMap);
        }
    }
}
