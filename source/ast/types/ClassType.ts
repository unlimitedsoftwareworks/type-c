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

import { getDataTypeByteSize } from "../../codegenerator/utils";
import { globalTypeCache } from "../../typechecking/TypeCache";
import { areSignaturesIdentical, matchDataTypes } from "../../typechecking/TypeChecking";
import { ClassAttribute } from "../other/ClassAttribute";
import { ClassMethod } from "../other/ClassMethod";
import { InterfaceMethod } from "../other/InterfaceMethod";
import { BlockStatement } from "../statements/BlockStatement";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType"
import { GenericType } from "./GenericType";
import { InterfaceType, checkOverloadedMethods } from "./InterfaceType";
import { UnsetType } from "./UnsetType";
import { VoidType } from "./VoidType";

export class ClassType extends DataType {
    attributes: ClassAttribute[];
    methods: ClassMethod[];
    // parents
    superTypes: DataType[];
    // parents after being resolved as interfaces
    superInterfaces: InterfaceType[] = [];

    staticBlock: BlockStatement | null = null;

    // offset of each attribute in the class, as ordered within `attributes` field
    attributeOffsetList: number[] = [];

    private _resolved: boolean = false;

    /**
     * Each instance of a class is assigned a unique id,
     * If two classes do not have the same ID, they are different.
     */
    static classCounter = 0;
    classId = ClassType.classCounter++;

    // used after parsing and analysis and prior to code gen
    // contains all methods, with all concrete types etc
    _allMethods: ClassMethod[] = [];

    constructor(location: SymbolLocation, superTypes: DataType[], attributes: ClassAttribute[], methods: ClassMethod[]) {
        super(location, "class");
        this.superTypes = superTypes;
        this.attributes = attributes;
        this.methods = methods;

        // TODO: check if we need this:
        for (const method of this.methods) {
            method.context.setActiveClass(this);
            if (method.body) {
                method.body.context.overrideParent(method.context);
            }
        }
    }

    resolve(ctx: Context, hint: DataType | null = null) {
        //if (this._resolved) return;

        if (globalTypeCache.get(this)) {
            return;
        }

        globalTypeCache.set(this);

        if (globalTypeCache.isChecking(this)) {
            return;
        }
        globalTypeCache.startChecking(this);

        /**
         * 1. Make sure all super types are interfaces
         */
        let superInterfaces: InterfaceType[] = [];
        for (const superType of this.superTypes) {
            superType.resolve(ctx);

            if (!superType.is(ctx, InterfaceType)) {
                ctx.parser.customError(`A class can only implement interfaces, ${superType.shortname()} is not an interface`, superType.location);
            }


            let interfaceSuper = superType.to(ctx, InterfaceType) as InterfaceType;
            superInterfaces.push(interfaceSuper);
        }
        this.superInterfaces = superInterfaces;

        /**
         * 2. Make sure attributes are correctly defined and init methods are correctly defined
         */
        this.checkAttributes(ctx);
        this.checkInitMethods(ctx);

        /**
         * 3. build up a list of all required methods, from the super types
         */
        let requiredMethods: InterfaceMethod[] = [];
        for (const superInterface of superInterfaces) {
            for (const method of superInterface.methods) {
                requiredMethods.push(method);
            }
        }

        /**
         * 4. Infer each method to compute the method's signature (in case return type is not specified)
         */
        for (const method of this.methods) {
            if(!method.imethod.isStatic){
                method.infer(ctx);
            }
        }


        /**
         * Make sure all required methods are implemented
         */
        for (const method of requiredMethods) {
            let m = this.findExactMethod(ctx, method);
            if (m == null) {
                ctx.parser.customError(`Method ${method.shortname()} is not implemented`, this.location);
            }
        }

        /**
         * Make sure we do not have two methods with the same signature
         */
        for (let i = 0; i < this.methods.length; i++) {
            for (let j = i + 1; j < this.methods.length; j++) {
                if (this.methods[i].imethod.name === this.methods[j].imethod.name) {
                    if (areSignaturesIdentical(ctx, this.methods[i].imethod.header, this.methods[j].imethod.header)) {
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
        globalTypeCache.stopChecking(this);
        globalTypeCache.set(this);
    }

    getClassID(){
        return this.classId;
    }

    shortname(): string {
        return "class {" + this.methods.map(e => e.shortname()).join(",") + "}";
    }

    serialize(unpack: boolean = false): string {
        return `@class{@attributes[${this.attributes.map(e => e.serialize(unpack))}],@methods[${this.methods.map(e => e.serialize(unpack)).join(",")}],@superTypes[${this.superTypes.map(e => e.serialize(unpack))}]`
    }

    /**
     * Checks the class for init methods, makes sure that the class init methods are correctly defined
     * 1. must be non static
     */
    checkInitMethods(ctx: Context) {
        for (let i = 0; i < this.methods.length; i++) {
            if (this.methods[i].imethod.name === "init") {
                // 1. must be non static
                if (this.methods[i].imethod.isStatic) {
                    throw ctx.parser.customError("init method cannot be static", this.methods[i].location);
                }

                // 2. must return void
                if (!this.methods[i].imethod.header.returnType.is(ctx, VoidType)) {
                    // maybe it is unset?
                    if (this.methods[i].imethod.header.returnType.is(ctx, UnsetType)) {
                        this.methods[i].imethod.header.returnType = new VoidType(this.methods[i].location);
                    }
                    else {
                        throw ctx.parser.customError("init method must return void", this.methods[i].location);
                    }
                }

                // 3. must be non-generic
                if (this.methods[i].imethod.generics.length > 0) {
                    throw ctx.parser.customError("init method cannot be generic", this.methods[i].location);
                }
            }
        }
    }

    /**
     * Check attributes, rules:
     * 1. Static attributes cannot be generic
     * 2. Must be called `init`.
     */
    checkAttributes(ctx: Context) {
        for (const attribute of this.attributes) {
            if (attribute.name === "init") {
                ctx.parser.customError("Class attributes cannot be called `init`", attribute.location);
            }

            //if (attribute.isStatic) {
                // resolving a generic results in an error, and since it could be an array of array of generics,
                // manually looking for generics makes no sense
                attribute.type.resolve(ctx);
            //}
        }
    }

    // TODO: implement
    resolveStaticBlock(ctx: Context) {
        throw new Error("Method not implemented.");
    }

    findExactMethod(ctx: Context, method: InterfaceMethod): ClassMethod | null {
        let foundMethod: ClassMethod | null = null;
        for (const classMethod of this.methods) {
            if (classMethod.imethod.name === method.name) {
                if (matchDataTypes(ctx, method.header, classMethod.imethod.header, true).success) {
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
        for (const method of this.methods) {
            if (method.imethod.name === name) {
                return true;
            }
        }
        return false;
    }


    buildAllMethods() {
        let allMethods: ClassMethod[] = [];
        for (const method of this.methods) {
            if (method.imethod.generics.length > 0) {
                let genericImpl = method.getConcreteGenerics()
                for (const [i, m] of genericImpl) {
                    m.indexInClass = allMethods.length;
                    allMethods.push(m);
                }
            }
            else {
                method.indexInClass = allMethods.length;
                allMethods.push(method);
            }
        }
        this._allMethods = allMethods;
    }

    /**
     * Returns All methods present in the class, generic methods are replaced with
     * their implementation.
     */
    getAllMethods() {
        if(this._allMethods.length === 0) {
            this.buildAllMethods();
        }

        return this._allMethods;
    }

    getAllNonStaticMethods() {
        return this.methods.filter(e => !e.imethod.isStatic);
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
    getMethodBySignature(ctx: Context, name: string, parameters: DataType[], returnType: DataType | null, genericArguments: DataType[]): InterfaceMethod[] {
        let findMethod = (ctx: Context, name: string, parameters: DataType[], returnType: DataType | null, genericArguments: DataType[], strict: boolean): InterfaceMethod[] => {
            let candidates: InterfaceMethod[] = [];
            let allMethods = this.methods;

            for (let method of allMethods) {
                if (method.imethod.name === name) {
                    // first check if the number of arguments match
                    if (method.imethod.header.parameters.length != parameters.length) {
                        continue
                    }

                    if (method.imethod.generics.length > 0) {
                        /**
                         * When we call a generic class method, there are two cases:
                         * 1. Generic types are provided e.g callMe<u32>(1), hence we just need to perform type checking
                         * 2. Generics types are not provided, in this case, we need to infer it from the usage
                         * If type arguments are partially provided, it will go through case 1 and fail.
                         *  => Expected behavior
                         */

                        // case 1:
                        if (genericArguments.length > 0) {
                            // make sure all generic types are provided
                            if (genericArguments.length !== method.imethod.generics.length) {
                                throw ctx.parser.customError(`Expected ${method.imethod.generics.length} generic types, got ${genericArguments.length}`, this.location);
                            }

                            let typeMap: { [key: string]: DataType } = {};
                            for (let i = 0; i < method.imethod.generics.length; i++) {
                                typeMap[method.imethod.generics[i].name] = genericArguments[i];
                            }

                            let concreteMethod = method.generateConcreteMethod(ctx, typeMap, genericArguments);
                            
                            if(returnType !== null) {
                                if (!concreteMethod.imethod.header.returnType.is(ctx, UnsetType) && !returnType.is(ctx, UnsetType)) {
                                    let res = matchDataTypes(ctx, concreteMethod.imethod.header.returnType, returnType, strict);
                                    if (!res.success) {
                                        continue;
                                    }
                                }
                            }

                            return [concreteMethod.imethod];
                        }
                        else {

                            // create a map of the generics specified in the method
                            let methodGenerics: { [key: string]: GenericType } = {};
                            for (let i = 0; i < method.imethod.generics.length; i++) {
                                methodGenerics[method.imethod.generics[i].name] = method.imethod.generics[i];
                            }


                            /**
                             * If we have a generic method, we need to extract the type map from the parameters and/or the return type
                             */
                            let map: { [key: string]: DataType } = {};
                            for (let i = 0; i < parameters.length; i++) {
                                let p = method.imethod.header.parameters[i];
                                p.type.getGenericParametersRecursive(method.context, parameters[i], methodGenerics, map);
                            }

                            if (returnType !== null) {
                                method.imethod.header.returnType.getGenericParametersRecursive(method.context, returnType, methodGenerics, map);
                            }

                            /**
                             * a generic type can be redundant:
                             *  for example:
    
                                    fn get<T>(x: {y: {z: T}})
    
                                when i call it with get({y: {z: {u32}}), it needs to map T with u32.
                                The issue is generics can have constraints and those constraints can be one of many, for example:
    
                                    fn dostuff<T: Circle | Cube>(x: T, y: T)
    
                                    let circle: Circle = new Circle()
                                    let cube: Cube = new Cube()
    
                                    dostuff(circle, cube) // FAIL
    
                                This because concrete method signature that is generated by the compiler, will account for only one T. Hence either a cricle or cube
                             */

                            let concreteReturnType = returnType !== null ? returnType.clone(map) : null;

                            /**
                             * First we need to create an ordered, type arguments list, as declared in the method
                             */
                            let typeArgs: DataType[] = [];

                            for (const generic of method.imethod.generics) {
                                if (map[generic.name] === undefined) {
                                    throw ctx.parser.customError(`Required generic type ${generic.name} not found in type map`, this.location);
                                }

                                typeArgs.push(map[generic.name]);
                            }

                            let concreteMethod = method.generateConcreteMethod(ctx, map, typeArgs);

                            if (concreteReturnType !== null) {
                                if (!concreteMethod.imethod.header.returnType.is(ctx, UnsetType) && !concreteReturnType.is(ctx, UnsetType)) {
                                    let res = matchDataTypes(ctx, concreteMethod.imethod.header.returnType, concreteReturnType!, strict);
                                    if (!res.success) {
                                        continue;
                                    }
                                }
                            }

                            return [concreteMethod.imethod];
                        }
                    }
                    else {
                        if(genericArguments.length > 0) {
                            // function do not support generics
                            continue;
                        }
                    }

                    if (returnType !== null) {
                        /**
                         * Sometime, returnType is unset, which in this case means we are recursivly checking the type against itself, hence we can accept
                         */
                        if (!returnType.is(ctx, UnsetType) && !method.imethod.header.returnType.is(ctx, UnsetType)) {
                            let res = matchDataTypes(ctx, returnType, method.imethod.header.returnType, strict);
                            if (!res.success) {
                                continue;
                            }
                        }
                    }

                    let allMatch = method.imethod.header.parameters.every((p, i) => {
                        let res = matchDataTypes(ctx, p.type, parameters[i], strict)
                        return res.success;
                    });

                    if (!allMatch) {
                        continue;
                    }

                    candidates.push(method.imethod);
                }
            }

            return candidates;
        }

        let candidates = findMethod(ctx, name, parameters, returnType, genericArguments, true);
        if (candidates.length === 0) {
            candidates = findMethod(ctx, name, parameters, returnType, genericArguments, false);
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
     * Currently not used
     * 
     */
    getMethodIndexBySignature(ctx: Context, name: string, parameters: DataType[], returnType: DataType | null): number {
        let findMethod = (ctx: Context, name: string, parameters: DataType[], returnType: DataType | null, strict: boolean): number => {
            let allMethods = this.methods;

            for (let i = 0; i < allMethods.length; i++) {
                let method = allMethods[i];
                if (method.imethod.name === name) {
                    if (method.imethod.generics.length > 0) {
                        throw ctx.parser.customError(`Cannot find non-generic method ${name} with given types ${parameters.map(e => e.shortname()).join(", ")} -> ${returnType?.shortname() || "void"} in class ${this.shortname()}`, this.location);
                    }

                    if (returnType !== null) {
                        let res = matchDataTypes(ctx, method.imethod.header.returnType, returnType, strict);
                        if (!res.success) {
                            continue;
                        }
                    }

                    if (method.imethod.header.parameters.length != parameters.length) {
                        continue
                    }

                    let allMatch = method.imethod.header.parameters.every((p, i) => {
                        let res = matchDataTypes(ctx, p.type, parameters[i], strict)
                        return res.success;
                    });

                    if (!allMatch) {
                        continue;
                    }

                    return i;
                }
            }

            return -1;
        }

        let index = findMethod(ctx, name, parameters, returnType, true);
        if (index === -1) {
            index = findMethod(ctx, name, parameters, returnType, false);
        }

        if (index === -1) {
            throw ctx.parser.customError(`Cannot find method ${name} with given types ${parameters.map(e => e.shortname()).join(", ")} -> ${returnType?.shortname() || "void"} in class ${this.shortname()}`, this.location);
        }

        return index;
    }

    getMethodByIndex(idx: number): ClassMethod | null {
        let allMethods = this.methods;
        if (idx < 0 || idx >= allMethods.length) {
            return null;
        }

        return allMethods[idx];
    }

    to(ctx: Context, targetType: new (...args: any[]) => DataType): DataType {
        if (targetType === InterfaceType) {
            let methods: InterfaceMethod[] = [];
            for (const method of this.methods) {
                // interfaces cannot have generic methods
                if (method.imethod.generics.length === 0) {
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

    allowedNullable(ctx: Context): boolean {
        return true;
    }

    clone(genericsTypeMap: { [key: string]: DataType }): ClassType {
        let clone = new ClassType(
            this.location,
            this.superTypes.map(e => e.clone(genericsTypeMap)),
            this.attributes.map(e => e.clone(genericsTypeMap)),
            this.methods.filter(e => !e.imethod.isStatic).map(e => e.clone(genericsTypeMap))
        );

        // make sure each method has current class as active class

        clone.methods.forEach((method) => {
            method.context.setActiveClass(clone);
            method.returnStatements.forEach((stmt) => {
                stmt.ctx.setActiveClass(clone);
            })
        })

        return clone;
    }

    /**
     * Since generic methods cannot be overloaded, 
     * we can simply return the method with the given name
     * @param name 
     */
    getGenericMethodByName(ctx: Context, name: string): ClassMethod | null {
        for (const method of this.methods) {
            if (method.imethod.name === name) {
                if (method.imethod.generics.length > 0) {
                    return method;
                }
                else {
                    throw new Error(`Method ${name} is not generic`);
                }
            }
        }
        return null;
    }


    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: { [key: string]: GenericType }, typeMap: { [key: string]: DataType }) {
        // make sure we have a class type
        if (!originalType.is(ctx, ClassType)) {
            ctx.parser.customError(`Expected class type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
        }

        let classType = originalType.to(ctx, ClassType) as ClassType;

        // now we call all attribute types and method types!
        for (let i = 0; i < classType.attributes.length; i++) {
            // make sure attribute names match otherwise throw an error
            if (this.attributes[i].name !== classType.attributes[i].name) {
                throw ctx.parser.customError(`Expected attribute ${this.attributes[i].name} got ${classType.attributes[i].name}`, this.location);
            }
            classType.attributes[i].type.getGenericParametersRecursive(ctx, classType.attributes[i].type, declaredGenerics, typeMap);
        }

        for (let i = 0; i < this.methods.length; i++) {
            // make sure method names match otherwise throw an error
            if (this.methods[i].imethod.name !== classType.methods[i].imethod.name) {
                throw ctx.parser.customError(`Expected method ${this.methods[i].imethod.name} got ${classType.methods[i].imethod.name}`, this.location);
            }
            this.methods[i].imethod.header.getGenericParametersRecursive(ctx, classType.methods[i].imethod.header, declaredGenerics, typeMap);
        }
    }

    /**
     * Methods used by the bytecode generator
     */
    getAttributes(){
        return this.attributes;
    }

    getAttribute(name: string){
        for(const attr of this.attributes){
            if(attr.name === name){
                return attr;
            }
        }
        return null;
    }

    getAttributeIndex(name: string): number {
        for(let i = 0; i < this.attributes.length; i++){
            if(this.attributes[i].name == name){
                return i;
            }
        }
        return -1;
    }

    getAttributesOffsetList(){
        if(this.attributeOffsetList.length == 0){
            let offset = 0;
            
            for(let attr of this.attributes){
                // we do not consider static attributes
                if(attr.isStatic) continue;
                this.attributeOffsetList.push(offset);
                offset += getDataTypeByteSize(attr.type.dereference());
            }
        }

        return this.attributeOffsetList;
    }

    getAttributeOffset(ctx: Context, name: string){
        let offsetList = this.getAttributesOffsetList();
        let index = this.getAttributeIndex(name);
        if(index == -1){
            throw ctx.parser.customError(`Cannot find attribute ${name} in class ${this.shortname()}`, this.location);
        }
        return offsetList[index];
    }

    /**
     * Finds a method by name and arguments. Only called during code generation, as
     * it requires that all method concrete types have been enumerated and generated 
     * beforehand. First tries to find an exact match, if not found, tries to find a 
     * compatible one.
     * 
     * @param ctx - The context in which to resolve types.
     * @param name - The name of the method to find.
     * @param parameters - The parameters to match against the method's parameters.
     * @param returnType - The return type to match against the method's return type.
     * @returns The matching method or null if no match is found.
     */
    findMethodByNameAndArguments(
        ctx: Context, 
        name: string, 
        parameters: DataType[], 
        returnType: DataType | null
    ): [number, ClassMethod] | null {
        const allMethods = this.getAllMethods();

        // Helper function to check if a method matches the given parameters and return type
        const matches = (method: ClassMethod, strict: boolean): boolean => {
            if (method.imethod.name !== name) return false;

            if (method.imethod.header.parameters.length !== parameters.length) return false;

            const allMatch = method.imethod.header.parameters.every((p, i) => {
                const res = matchDataTypes(ctx, p.type, parameters[i], strict);
                return res.success;
            });

            if (!allMatch) return false;

            if (returnType !== null) {
                if (!returnType.is(ctx, UnsetType) && !method.imethod.header.returnType.is(ctx, UnsetType)) {
                    const res = matchDataTypes(ctx, returnType, method.imethod.header.returnType, strict);
                    return res.success;
                }
            }

            return true;
        };

        // First, try to find an exact match
        for (const [i, method] of allMethods.entries()) {
            if (matches(method, true)) {
                return [i, method];
            }
        }

        // If no exact match is found, try to find a compatible match
        for (const [i, method] of allMethods.entries()) {
            if (matches(method, false)) {
                return [i, method];
            }
        }

        return null;
    }

    getAllStaticMethods(){
        let methods: ClassMethod[] = [];
        for(const [key, method] of this.methods.entries()) {
            if(method.imethod.isStatic){
                if(method.imethod.generics.length > 0){
                    let genericImpl = method.getConcreteGenerics()
                    for (const [i, m] of genericImpl) {
                        methods.push(m);
                    }
                }
                else{
                    methods.push(method);
                }
            }
        }
        return methods;
    }

    getIndexesForInterfaceMethods(ctx: Context, interfaceType: InterfaceType): number[] {
        let indexes: number[] = [];
        for(const [i, method] of interfaceType.getMethods().entries()){
            
            let res = this.findMethodByNameAndArguments(ctx, method.name, method.header.parameters.map(e => e.type), method.header.returnType);
            if(res){
                indexes.push(res[0]);
            }

        }
        return indexes;
    }


    getAttributesBlockSize(){
        let size = 0;
        for(let attr of this.attributes){
            // we do not consider static attributes
            if(attr.isStatic) continue;
            size += getDataTypeByteSize(attr.type.dereference());
        }
        return size;
    }
}