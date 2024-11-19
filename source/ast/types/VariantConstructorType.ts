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
import {DataType} from "./DataType";
import { GenericType } from "./GenericType";
import { VariantType } from "./VariantType";


export class VariantParameter {
    name: string;
    type: DataType;
    location: SymbolLocation;

    // ID 0 is reserved for the constructor tag stored in the first 16bits of the structs bytecode
    static globalFieldID = 1;
    static fieldIdMap: { [key: string]: number } = {};
    static getFieldID(name: string): number {
        if (VariantParameter.fieldIdMap[name] == undefined) {
            throw new Error(`Field ${name} does not exist`);
        }
        return VariantParameter.fieldIdMap[name];
    }

    constructor(location: SymbolLocation, name: string, type: DataType){
        this.location = location;
        this.name = name;
        this.type = type;

        if (VariantParameter.fieldIdMap[name] == undefined) {
            VariantParameter.fieldIdMap[name] = VariantParameter.globalFieldID;
            VariantParameter.globalFieldID++;
        }
    }

    clone(typeMap: { [key: string]: DataType; }): VariantParameter {
        return new VariantParameter(this.location, this.name, this.type.clone(typeMap));
    }

    getFieldID(): number {
        return VariantParameter.getFieldID(this.name);
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
        // make sure all fields are valid, duplicate are already checked by the parser
        for(let field of this.parameters) {
            field.type.resolve(ctx);
        }
    }

    setParent(parent: VariantType) {
        this._parent = parent;
    }

    shortname(): string {
        return this.name+"("+this.parameters.map(f => f.name+":"+f.type.shortname()).join(",")+")"
    }

    serialize(unpack: boolean = false): string {
        return `@variant_constructor{name:${this.name},parameters:[${this.parameters.map(f => `${f.name}:${f.type.serialize(unpack)}`).join(",")}]}`;
    }

    allowedNullable(ctx: Context): boolean {
        return true;
    }

    clone(typeMap: { [key: string]: DataType; }): VariantConstructorType {
        return new VariantConstructorType(this.location, this.name, this.parameters.map(f => f.clone(typeMap)));
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        if(this.preGenericExtractionRecursion()){
            return;
        }

        // make sure originalType is a VariantConstructorType
        if(!originalType.is(ctx, VariantConstructorType)){
            ctx.parser.customError(`Expected variant constructor type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
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
        let sizes = this.parameters.map(f => getDataTypeByteSize(f.type));
        return sizes.reduce((a, b) => Math.max(a, b), 0);
    }

    getStructSize(){
        // +1 for the hidden `type` field
        return this.getAlignment() * (this.parameters.length+1);
    }

    getParameterOffset(fieldNum: number): number {
        let offset = 0;
        let alignment = this.getAlignment();

        return fieldNum*alignment;
    }
}
