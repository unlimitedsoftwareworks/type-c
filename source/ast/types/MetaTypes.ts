/**
 * Filename: MetaTypes.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models data types used as expressions, for example
 *      accessing a static method of a class
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation"
import { ClassType } from "./ClassType"
import { DataType, DataTypeKind } from "./DataType"
import { GenericType } from "./GenericType";

export class MetaType extends DataType {
    genericParameters: GenericType[];

    constructor(location: SymbolLocation, kind: DataTypeKind, genericParameters: GenericType[]){
        super(location, kind);
        this.genericParameters = genericParameters;
    }

    clone(genericsTypeMap: {[key: string]: DataType}): MetaType{
        return this;
    }


    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        // nothing to do here, meta types don't have generic parameters
    }
}

export class MetaClassType extends MetaType {
    classType: DataType;
    typeArguments: DataType[];

    constructor(location: SymbolLocation, classType: DataType, genericParameters: GenericType[], genericTypes: DataType[] = []) {
        super(location, "meta_class", genericParameters);
        this.classType = classType;
        this.typeArguments = genericTypes;
    }

    serialize(unpack: boolean = false): string {
        return `@MetaClass{${this.classType.serialize(unpack)}}`;
    }

    resolve(ctx: Context): void {

    }
}

export class MetaInterfaceType extends MetaType {
    interfaceType: DataType;

    constructor(location: SymbolLocation, interfaceType: DataType) {
        super(location, "meta_interface", []);
        this.interfaceType = interfaceType;
    }

    serialize(unpack: boolean = false): string {
        return `@MetaInterface{${this.interfaceType.serialize(unpack)}}`;
    }

    resolve(ctx: Context): void {

    }
}

export class MetaVariantType extends MetaType {
    variantType: DataType;
    typeArguments: DataType[];

    constructor(location: SymbolLocation, variantType: DataType, genericParameters: GenericType[], genericTypes: DataType[] = []) {
        super(location, "meta_variant", genericParameters);
        this.variantType = variantType;
        this.typeArguments = genericTypes;
    }

    serialize(unpack: boolean = false): string {
        return `MetaVariant{${this.variantType.serialize(unpack)}}`;
    }

    resolve(ctx: Context): void {
        this.variantType.resolve(ctx);
    }
}

export class MetaVariantConstructorType extends MetaType {
    variantConstructorType: DataType;
    typeArguments: DataType[];

    constructor(location: SymbolLocation, variantConstructorType: DataType, genericParameters: GenericType[], genericTypes: DataType[] = []) {
        super(location, "meta_variant_constructor", genericParameters);
        this.variantConstructorType = variantConstructorType;
        this.typeArguments = genericTypes;
    }

    serialize(unpack: boolean = false): string {
        return `MetaVariantConstructor{${this.variantConstructorType.serialize(unpack)}}`;
    }

    resolve(ctx: Context): void {

    }
}

export class MetaEnumType extends MetaType {
    enumType: DataType;

    constructor(location: SymbolLocation, enumType: DataType) {
        super(location, "meta_enum", []);
        this.enumType = enumType;
    }

    serialize(unpack: boolean = false): string {
        return `MetaEnum{${this.enumType.serialize(unpack)}}`;
    }

    resolve(ctx: Context): void {

    }
}