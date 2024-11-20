/**
 * Filename: ClassType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models an interface datatype
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {DataType} from "./DataType";
import {InterfaceMethod} from "../other/InterfaceMethod";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { areSignaturesIdentical, matchDataTypes } from "../../typechecking/TypeChecking";
import { GenericType } from "./GenericType";


export class InterfaceType extends DataType {
    /**
     * InterfaceMethod
     * methods can be overloaded, as long as the argument types are different
     * methods can be static or not
     */
    methods: InterfaceMethod[];

    /**
     * All methods, including the ones from the super types
     */
    _allMethods: InterfaceMethod[] = [];

    // interfaces can only extend from references and not anonymous types
    superTypes: DataType[];

    // superTypes after being resolved as InterfaceTypes
    superInterfaces: InterfaceType[] = [];

    private _resolved: boolean = false;

    constructor(location: SymbolLocation, methods: InterfaceMethod[], superType: DataType[] = []) {
        super(location, "interface");
        this.methods = methods;
        this.superTypes = superType;
    }

    shortname(): string {
        return "interface"
    }

    serialize(unpack: boolean = false): string {
        let superType = this.superTypes.map((superType) => superType.serialize(unpack)).join(",");
        let methods = this.methods.map((method) => method.serialize(unpack)).join(",");
        return `@interface{${superType}:${methods}}`
    }


    to(ctx: Context, targetType: new (...args: any[]) => DataType): DataType {
        if(targetType === InterfaceType) return this;
        throw new Error(`Cannot cast interface to ${targetType.name}`);
    }

    resolve(ctx: Context) {
        if(this._resolved) return;

        if(this.preResolveRecursion()){
            return;
        }

        // make sure all supertypes are resolved
        let superInterfaces: InterfaceType[] = [];
        this.superTypes.forEach((superType) => {
            superType.resolve(ctx);

            if(!superType.is(ctx, InterfaceType)){
                ctx.parser.customError("Interface can only extend from other interfaces", superType.location);
                return;
            }

            let interfaceSuper = superType.to(ctx, InterfaceType) as InterfaceType;

            superInterfaces.push(interfaceSuper);
        });

        this.superInterfaces = superInterfaces;

        // make sure methods has no generic types
        this.methods.forEach((method) => {
            if(method.generics.length > 0) {
                ctx.parser.customError("Interface methods cannot be generic", method.generics[0].location);
                return;
            }
        });

        // combine all methods
        let allMethods = this.methods;
        superInterfaces.forEach((superInterface) => {
            allMethods = allMethods.concat(superInterface.methods.map(e => e.clone({})));
        });

        this._allMethods = allMethods;

        // set the index of the method in the interface
        this._allMethods.forEach((method, index) => {
            method._indexInInterface = index;
        });

        /**
         * Checking for duplicated methods,
         * type-c support method overloading, as long as the argument types are different
         */
        let methodNames: string[] = allMethods.map((method) => method.name);

        for(let i = 0; i < methodNames.length; i++){
            for(let j = i+1; j < methodNames.length; j++){
                if(methodNames[i] == methodNames[j]){
                    // if one of them is generic, we do allow duplicates

                    // we perform the check solely based on the arguments, not the return type
                    if(areSignaturesIdentical(ctx, allMethods[i], allMethods[j])){
                        ctx.parser.customError(`Method ${methodNames[i]} is duplicated with the same signature`, allMethods[j].location);
                        return;
                    }
                }
            }
        }

        checkOverloadedMethods(ctx, allMethods);

        this._resolved = true;

        this.postResolveRecursion()
    }

    /**
     * Returns true if a method with the given name exists
     * @param ctx
     * @param name
     * @returns
     */
    methodExists(ctx: Context, name: string): boolean {
        return this._allMethods.some((method) => method.name == name);
    }

     /**
     * Returns the methods which matches the given signature.
     * The return type is optional as it is not part of the signature, but if present
     * in this function call, a check will be performed to make sure it matches.
     *
     * This function will first look for a method matching the exact signature, meaning strict checking,
     * if none found, strictness is set to false, and it searches again.
     *
     * This function will also look into instanciated generic functions,
     *
     * @param ctx
     * @param name
     * @param parameters
     * @param returnType
     */
     getMethodBySignature(ctx: Context, name: string, parameters: DataType[], returnType: DataType | null): InterfaceMethod[] {
        let findMethod = (strict: boolean): InterfaceMethod[] => {
            let candidates: InterfaceMethod[] = [];
            let allMethods = this._allMethods;

            for(let method of allMethods) {
                if (method.name === name) {
                    if(method.generics.length > 0) {
                        // generic methods cannot be overloaded, returning only one
                        return [method];
                    }

                    if(returnType !== null) {
                        let res = matchDataTypes(ctx, method.header.returnType, returnType, strict);
                        if(!res.success){
                            continue;
                        }
                    }

                    if(method.header.parameters.length != parameters.length) {
                        continue
                    }

                    let allMatch = method.header.parameters.every((p, i) => {
                        let res = matchDataTypes(ctx, p.type, parameters[i], strict)
                        return res.success;
                    });

                    if(!allMatch) {
                        continue;
                    }

                    candidates.push(method);
                }
            }

            return candidates;
        }

        let candidates = findMethod(true);
        if(candidates.length === 0) {
            candidates = findMethod(false);
        }

        return candidates;
    }

    getMethodIndexBySignature(ctx: Context, name: string, parameters: DataType[], returnType: DataType | null): number {
        let candidates = this.getMethodBySignature(ctx, name, parameters, returnType);

        if (candidates.length === 0) {
            return -1;
        }
        if (candidates.length > 1) {
            ctx.parser.customError(`Ambiguous method ${name} with given types ${parameters.map(e => e.shortname()).join(", ")} -> ${returnType?.shortname() || "void"} in interface ${this.shortname()}`, this.location);
        }
        return candidates[0]._indexInInterface;
    }

    allowedNullable(ctx: Context): boolean {
        return true;
    }

    clone(genericsTypeMap: {[key: string]: DataType}): InterfaceType{
        let clone = new InterfaceType(this.location, this.methods.map((method) => method.clone(genericsTypeMap)), this.superTypes.map((superType) => superType.clone(genericsTypeMap)));
        return clone;
    }


    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        if(this.preGenericExtractionRecursion()){
            return;
        }

        // make sure originalType is an InterfaceType
        if(!originalType.is(ctx, InterfaceType)){
            ctx.parser.customError(`Expected interface type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
        }

        // make sure number of methods is the same
        let interfaceType = originalType.to(ctx, InterfaceType) as InterfaceType;
        if(this._allMethods.length != interfaceType._allMethods.length){
            ctx.parser.customError(`Expected ${interfaceType.methods.length} methods, got ${this._allMethods.length} instead.`, this.location);
        }

        for(let i = 0; i < this._allMethods.length; i++){
            // make sure method name is the same
            if(this._allMethods[i].name != interfaceType.methods[i].name){
                ctx.parser.customError(`Expected method ${interfaceType._allMethods[i].name}, got ${this._allMethods[i].name} instead.`, this.location);
            }

            // get generics for the method
            this._allMethods[i].header.getGenericParametersRecursive(ctx, interfaceType._allMethods[i].header, declaredGenerics, typeMap);
        }

        this.postGenericExtractionRecursion();
    }

    /**
     * checks whether the given interfaces matches the exact same method order
     * (number can be less but not more)
     * checking by name is enough because this is used in codegen phase
     * @param interface
     */
    interfacesAlign(obj: InterfaceType): boolean {
        if(obj._allMethods.length > this._allMethods.length){
            return false;
        }
        // TODO: refactor this to use getMethodIndexBySignature
        for(let i = 0; i < obj._allMethods.length; i++){
            if(obj._allMethods[i].name != this._allMethods[i].name){
                return false;
            }
            // make sure they also match, in terms of prototype
            // here we perform an exact match, maybe a compatible match in the future?
            // TODO: compare with type checking for compatible match instead of exact match
            let match = obj._allMethods[i].header.toString() == this._allMethods[i].header.toString()
            if(!match){
                return false;
            }
        }

        return true;
    }

    getMethods(): InterfaceMethod[] {
        return this._allMethods;
    }

    /**
     * Returns the number of methods in the interface
     * @returns
     */
    getMethodsLength(): number {
        return this._allMethods.length;
    }

    /**
     * called when the obj doesn't align with this interface
     * hence we need to generate offset swaps
     * @param obj
     */
    generateOffsetSwaps(ctx: Context, obj: InterfaceType) {
        let swaps: number[] = [];
        for(let i = 0; i < obj._allMethods.length; i++){
            let method = obj.methods[i];
            let index = this.getMethodIndexBySignature(ctx, method.name, method.header.parameters.map(e => e.type), method.header.returnType);
            if (index == -1) {
                ctx.parser.customError(`Method ${method.name} not found in interface`, method.location);
            }
            swaps.push(index);
        }

        return swaps;
        }
}

export function checkOverloadedMethods(ctx: Context, methods: InterfaceMethod[]){
    methods.forEach((method) => {
        // make sure __inc__, __dec__, __neg__, __not__, __invert__ have no arguments
        if(["__inc__", "__dec__", "__neg__", "__not__", "__invert__"].includes(method.name)){
            if(method.header.parameters.length != 0){
                ctx.parser.customError(`Method ${method.name} cannot have arguments`, method.location);
            }
            if(method.isStatic){
                ctx.parser.customError(`Method ${method.name} cannot be static`, method.location);
            }
        }

        // make sure __index__ has at least one argument
        if(method.name == "__index__"){
            if(method.header.parameters.length == 0){
                ctx.parser.customError(`Method ${method.name} must have at least one argument`, method.location);
            }
            if(method.isStatic){
                ctx.parser.customError(`Method ${method.name} cannot be static`, method.location);
            }
        }

        if(method.name == "__index_set__"){
            if(method.header.parameters.length < 2){
                ctx.parser.customError(`Method ${method.name} must have at least two argument`, method.location);
            }
            if(method.isStatic){
                ctx.parser.customError(`Method ${method.name} cannot be static`, method.location);
            }
        }

        // make sure __mul__, __div__, __mod__, __add__, __sub__, __lshift__, __rshift__, __lt__, __le__, __gt__, __ge__, __band__, __xor__, __bor__, __and__, __or__ have exactly one argument
        if(["__mul__", "__div__", "__mod__", "__add__", "__sub__", "__lshift__", "__rshift__", "__lt__", "__le__", "__gt__", "__ge__", "__band__", "__xor__", "__bor__", "__and__", "__or__"].includes(method.name)){
            if(method.header.parameters.length != 1){
                ctx.parser.customError(`Method ${method.name} must have exactly one argument`, method.location);
            }
            if(method.isStatic){
                ctx.parser.customError(`Method ${method.name} cannot be static`, method.location);
            }
        }
    });
}
