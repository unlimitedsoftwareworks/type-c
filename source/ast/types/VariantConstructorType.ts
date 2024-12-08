/**
 * Filename: VariantConstructorType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     This class is used to represent a variant constructor type.
 *     A variant constructor, is an instance of an algebraic data type.
 *     For example:
 *     tree = leaf | node, leaf and node are variant constructors.
 *     tree is the variant type.
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { getDataTypeByteSize } from "../../codegenerator/utils";
import { Context } from "../symbol/Context";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { BasicType } from "./BasicType";
import {DataType} from "./DataType";
import { GenericType } from "./GenericType";
import { StructField } from "./StructType";
import { VariantType } from "./VariantType";


export class VariantParameter {
    name: string;
    type: DataType;
    location: SymbolLocation;

    // ID 0 is reserved for the constructor tag stored in the first 16bits of the structs bytecode
    // we start with the tag field at ID 0, always
    static getFieldID(name: string): number {
        return StructField.getFieldID(name);
    }

    constructor(location: SymbolLocation, name: string, type: DataType){
        this.location = location;
        this.name = name;
        this.type = type;

        StructField.registerFieldID(name);
    }

    clone(typeMap: { [key: string]: DataType; }): VariantParameter {
        return new VariantParameter(this.location, this.name, this.type.clone(typeMap));
    }

    getFieldID(): number {
        return VariantParameter.getFieldID(this.name);
    }

    static sortParameters(parameters: VariantParameter[], loc: SymbolLocation): VariantParameter[] {
        return sortVariantParameters([...parameters, new VariantParameter(loc, "$tag", new BasicType(loc, "u16"))]);
    }
}

export class VariantConstructorType  extends DataType{
    name: string;
    parameters: VariantParameter[];

    _parent: VariantType | null = null;
    _id: number | null = null;

    constructor(location: SymbolLocation, name: string, parameters: VariantParameter[]){
        super(location, "variant_constructor")
        this.name = name;
        this.parameters = parameters;
    }

    resolve(ctx: Context) {
        if(this.preResolveRecursion()){
            return;
        }

        // make sure all fields are valid, duplicate are already checked by the parser
        for(let field of this.parameters) {
            field.type.resolve(ctx);
        }

        this.postResolveRecursion()
    }

    setParent(parent: VariantType) {
        this._parent = parent;
    }

    shortname(): string {
        return this.name+"("+this.parameters.map(f => f.name+":"+f.type.getShortName()).join(",")+")"
    }

    serialize(unpack: boolean = false): string {
        return `@variant_constructor{name:${this.name},parameters:[${this.parameters.map(f => `${f.name}:${f.type.serialize(unpack)}`).join(",")}]}`;
    }

    allowedNullable(ctx: Context): boolean {
        return true;
    }

    clone(typeMap: { [key: string]: DataType; }): VariantConstructorType {
        let newV = new VariantConstructorType(this.location, this.name, this.parameters.map(f => f.clone(typeMap)));
        newV._id = this._id;
        return newV;
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        if(this.preGenericExtractionRecursion()){
            return;
        }

        // make sure originalType is a VariantConstructorType
        if(!originalType.is(ctx, VariantConstructorType)){
            ctx.parser.customError(`Expected variant constructor type when mapping generics to types, got ${originalType.getShortName()} instead.`, this.location);
        }

        let variantConstructorType = originalType.to(ctx, VariantConstructorType) as VariantConstructorType;
        for(let i = 0; i < this.parameters.length; i++){
            // make sure parameter name matches
            if(this.parameters[i].name != variantConstructorType.parameters[i].name){
                ctx.parser.customError(`Expected parameter name ${this.parameters[i].name} but got ${variantConstructorType.parameters[i].name}`, this.location);
            }

            this.parameters[i].type.getGenericParametersRecursive(ctx, variantConstructorType.parameters[i].type, declaredGenerics, typeMap);
        }

        this.postGenericExtractionRecursion();
    }

    setId(id: number) {
        this._id = id;
    }

    getId(): number {
        return this._id!;
    }

    getParameterIndex(name: string): number {
        for(let i = 0; i < this.parameters.length; i++){
            if(this.parameters[i].name == name){
                return i;
            }
        }
        return -1;
    }

    getParameterType(i: number): DataType {
        return this.parameters[i].type;
    }

    getAlignment(): number {
        // 2 for the tag field which is u16
        let sizes = [2, ...this.parameters.map(f => getDataTypeByteSize(f.type))];
        return sizes.reduce((a, b) => Math.max(a, b), 0);
    }

    getStructSize(){
        // +1 for the hidden `$tag` field
        return this.getAlignment() * (this.parameters.length+1);
    }

    getParameterOffset(fieldNum: number): number {
        let alignment = this.getAlignment();
        return fieldNum*alignment;
    }
}

/**
 * Sorts class methods by their UID,
 */
function sortVariantParameters(params: VariantParameter[]) {
    let sortedParams = params.sort((a, b) => a.getFieldID() - b.getFieldID());
    return sortedParams;
}
