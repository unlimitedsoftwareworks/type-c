import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation"
import { ClassType } from "./ClassType"
import { DataType, DataTypeKind } from "./DataType"

export class MetaType extends DataType {
    constructor(location: SymbolLocation, kind: DataTypeKind) {
        super(location, kind)
    }
}

export class MetaClassType extends MetaType {
    classType: DataType;
    typeArguments: DataType[];

    constructor(location: SymbolLocation, classType: DataType, genericTypes: DataType[] = []) {
        super(location, "meta_class");
        this.classType = classType;
        this.typeArguments = genericTypes;
    }

    serialize(): string {
        return `MetaClass<${this.classType.serialize()}>`;
    }

    resolve(ctx: Context): void {

    }
}

export class MetaInterfaceType extends MetaType {
    interfaceType: DataType;

    constructor(location: SymbolLocation, interfaceType: DataType) {
        super(location, "meta_interface");
        this.interfaceType = interfaceType;
    }

    serialize(): string {
        return `MetaInterface<${this.interfaceType.serialize()}>`;
    }

    resolve(ctx: Context): void {

    }
}

export class MetaVariantType extends MetaType {
    variantType: DataType;
    typeArguments: DataType[];

    constructor(location: SymbolLocation, variantType: DataType, genericTypes: DataType[] = []) {
        super(location, "meta_variant");
        this.variantType = variantType;
        this.typeArguments = genericTypes;
    }

    serialize(): string {
        return `MetaVariant<${this.variantType.serialize()}>`;
    }

    resolve(ctx: Context): void {

    }
}

export class MetaVariantConstructorType extends MetaType {
    variantConstructorType: DataType;
    typeArguments: DataType[];

    constructor(location: SymbolLocation, variantConstructorType: DataType, genericTypes: DataType[] = []) {
        super(location, "meta_variant_constructor");
        this.variantConstructorType = variantConstructorType;
        this.typeArguments = genericTypes;
    }

    serialize(): string {
        return `MetaVariantConstructor<${this.variantConstructorType.serialize()}>`;
    }

    resolve(ctx: Context): void {

    }
}

export class MetaEnumType extends MetaType {
    enumType: DataType;

    constructor(location: SymbolLocation, enumType: DataType) {
        super(location, "meta_enum");
        this.enumType = enumType;
    }

    serialize(): string {
        return `MetaEnum<${this.enumType.serialize()}>`;
    }

    resolve(ctx: Context): void {

    }
}