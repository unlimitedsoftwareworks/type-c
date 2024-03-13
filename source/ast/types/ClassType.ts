/**
 * Filename: ClassType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a class datatype
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { areSignaturesIdentical, matchDataTypes } from "../../typechecking/typechecking";
import { ClassAttribute } from "../other/ClassAttribute";
import { ClassMethod } from "../other/ClassMethod";
import { InterfaceMethod } from "../other/InterfaceMethod";
import { BlockStatement } from "../statements/BlockStatement";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType"
import { InterfaceType, checkOverloadedMethods } from "./InterfaceType";
import { ReferenceType } from "./ReferenceType";


export class ClassType extends DataType {
    attributes: ClassAttribute[];
    methods: ClassMethod[];
    superTypes: ReferenceType[];

    staticBlock: BlockStatement | null = null;

    private _resolved: boolean = false;

    constructor(location: SymbolLocation, superTypes: ReferenceType[], attributes: ClassAttribute[], methods: ClassMethod[]) {
        super(location, "class");
        this.superTypes = superTypes;
        this.attributes = attributes;
        this.methods = methods;

        // TODO: check if we need this:
        for(const method of this.methods) {
            method.context.setActiveClass(this);
            if(method.body) {
                method.body.context.overrideParent(method.context);
            }
        }
    }

    resolve(ctx: Context, hint: DataType | null = null) {
        if(this._resolved) return;

        /**
         * 1. Make sure all super types are interfaces
         */
        let superInterfaces: InterfaceType[] = [];
        for(const superType of this.superTypes) {
            superType.resolve(ctx);

            let interfaceSuper = superType.dereference();
            if((interfaceSuper == null) || !(interfaceSuper instanceof InterfaceType)) {
                ctx.parser.customError(`A class can only implement interfaces, ${superType.shortname()} is not an interface`, superType.location);
            }

            superInterfaces.push(interfaceSuper);
        }

        /**
         * 2. Make sure attributes are correctly defined
         */
        this.checkAttributes(ctx);

        /**
         * 3. build up a list of all required methods, from the super types
         */
        let requiredMethods: InterfaceMethod[] = [];
        for(const superInterface of superInterfaces) {
            for(const method of superInterface.methods) {
                requiredMethods.push(method);
            }
        }

        /**
         * 4. Infer each method to compute the method's signature (in case return type is not specified)
         */
        for(const method of this.methods) {
            method.infer(ctx);
        }

        
        /**
         * Make sure all required methods are implemented
         */
        for(const method of requiredMethods) {
            let m = this.findExactMethod(ctx, method);
            if (m == null) {
                ctx.parser.customError(`Method ${method.name} is not implemented`, this.location);
            }
        }

        /**
         * Make sure we do not have two methods with the same signature
         */
        for(let i = 0; i < this.methods.length; i++) {
            for(let j = i + 1; j < this.methods.length; j++) {
                if(this.methods[i].imethod.name === this.methods[j].imethod.name) {
                    if(areSignaturesIdentical(ctx, this.methods[i].imethod.header, this.methods[j].imethod.header)) {
                        ctx.parser.customError(`Method ${this.methods[i].imethod.name} is overloaded`, this.location);
                    }
                }
            }
        }
         
        
        /**
         * 4. make sure operator overloads are properly defined, for example __add__ takes exactly one argument and must return
         * a value
         */
        checkOverloadedMethods(ctx, this.methods.map(e => e.imethod));
        

        this._resolved = true;
    }

    shortname(): string {
        return "class"
    }

    serialize(): string {
        return `@class{@attributes[${this.attributes.map(e => e.serialize())}],@methods[${this.methods.map(e => e.serialize()).join(",")}],@superTypes[${this.superTypes.map(e => e.serialize())}`
    }

    /**
     * Checks the class for init methods, makes sure that the class init methods are correctly defined
     * 1. must be non static
     */
    checkInitMethods(ctx: Context) {
        let init
    }

    /**
     * Check attributes, rules:
     * 1. Static attributes cannot be generic
     * 2. Must be called `init`.
     */
    checkAttributes(ctx: Context) {
        for(const attribute of this.attributes) {
            if(attribute.name === "init") {
                ctx.parser.customError("Class attributes cannot be called `init`", attribute.location);
            }

            if(attribute.isStatic) {
                // TODO: finish
            }
        }
    }

    // TODO: implement
    resolveStaticBlock(ctx: Context) {
        throw new Error("Method not implemented.");
    }

    findExactMethod(ctx: Context, method: InterfaceMethod): ClassMethod | null {
        let foundMethod: ClassMethod | null = null;
        for(const classMethod of this.methods) {
            if(classMethod.imethod.name === method.name) {
                if (matchDataTypes(ctx, classMethod.imethod.header, method.header, true)) {
                    foundMethod = classMethod;
                    break;
                }
            }
        }

        return foundMethod
    }

    /**
     * Returns true of the class has a method with the given name
     * @param ctx 
     * @param name 
     * @returns 
     */
    methodExists(ctx: Context, name: string): boolean {
        for(const method of this.methods) {
            if(method.imethod.name === name) {
                return true;
            }
        }
        return false;
    }


    /**
     * Returns All methods present in the class, generic methods are replaced with
     * their implementation.
     */
    getAllMethods() {
        let allMethods: ClassMethod[] = [];
        for(const method of this.methods) {
            if(method.imethod.generics.length > 0) {
                let genericImpl = method.getConcreteGenerics()
                for(let key in genericImpl){
                    allMethods.push(genericImpl[key]);
                }
            }
            else {
                allMethods.push(method);
            }
        }

        return allMethods;
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
        let findMethod = (ctx: Context, name: string, parameters: DataType[], returnType: DataType | null, strict: boolean): InterfaceMethod[] => {
            let candidates: InterfaceMethod[] = [];
            let allMethods = this.getAllMethods();

            for(let method of allMethods) {
                if (method.imethod.name === name) {
                    if(method.imethod.generics.length > 0) {
                        // generic methods cannot be overloaded, returning only one
                        return [method.imethod];
                    }

                    if(returnType !== null) {
                        let res = matchDataTypes(ctx, method.imethod.header.returnType, returnType, strict);
                        if(!res.success){
                            continue;
                        }
                    }

                    if(method.imethod.header.parameters.length != parameters.length) {
                        continue
                    }

                    let allMatch = method.imethod.header.parameters.every((p, i) => {
                        let res = matchDataTypes(ctx, p.type, parameters[i], strict)
                        return res.success;
                    });

                    if(!allMatch) {
                        continue;
                    }

                    candidates.push(method.imethod);
                }
            }

            return candidates;
        }

        let candidates = findMethod(ctx, name, parameters, returnType, true);
        if(candidates.length === 0) {
            candidates = findMethod(ctx, name, parameters, returnType, false);
        }

        return candidates;
    }

    /**
     * Very similar behavior to getMethodBySignature, but returns the index of the method in the class,
     * also it only returns a single index, if there are multiple methods with the same signature, an error is thrown.
     * Returns -1 if no method is found.
     * 
     * This method works only to retrieve non-generic methods.
     * 
     */
    getMethodIndexBySignature(ctx: Context, name: string, parameters: DataType[], returnType: DataType | null): number {
        let findMethod = (ctx: Context, name: string, parameters: DataType[], returnType: DataType | null, strict: boolean): number => {
            let allMethods = this.getAllMethods();

            for(let i = 0; i < allMethods.length; i++) {
                let method = allMethods[i];
                if (method.imethod.name === name) {
                    if(method.imethod.generics.length > 0) {
                        throw ctx.parser.customError(`Cannot find non-generic method ${name} with given types ${parameters.map(e => e.shortname()).join(", ")} -> ${returnType?.shortname() || "void"} in class ${this.shortname()}`, this.location);
                    }

                    if(returnType !== null) {
                        let res = matchDataTypes(ctx, method.imethod.header.returnType, returnType, strict);
                        if(!res.success){
                            continue;
                        }
                    }

                    if(method.imethod.header.parameters.length != parameters.length) {
                        continue
                    }

                    let allMatch = method.imethod.header.parameters.every((p, i) => {
                        let res = matchDataTypes(ctx, p.type, parameters[i], strict)
                        return res.success;
                    });

                    if(!allMatch) {
                        continue;
                    }

                    return i;
                }
            }

            return -1;
        }

        let index = findMethod(ctx, name, parameters, returnType, true);
        if(index === -1) {
            index = findMethod(ctx, name, parameters, returnType, false);
        }

        if(index === -1) {
            throw ctx.parser.customError(`Cannot find method ${name} with given types ${parameters.map(e => e.shortname()).join(", ")} -> ${returnType?.shortname() || "void"} in class ${this.shortname()}`, this.location);
        }

        return index;
    }

    to(targetType: new (...args: any[]) => DataType): DataType {
        if(targetType === InterfaceType){
            let methods: InterfaceMethod[] = [];
            for(const method of this.methods) {
                // interfaces cannot have generic methods
                if(method.imethod.generics.length === 0) {
                    methods.push(method.imethod);
                }
            }

            return new InterfaceType(this.location, methods, []);
        }
        else if (targetType === ClassType) {
            return this;
        }

        throw new Error(`Cannot convert class to ${targetType.name}`);
    }
}