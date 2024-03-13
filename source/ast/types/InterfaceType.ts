import {DataType} from "./DataType";
import {InterfaceMethod} from "../other/InterfaceMethod";
import {ReferenceType} from "./ReferenceType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { FunctionType } from "./FunctionType";
import { areSignaturesIdentical } from "../../typechecking/typechecking";


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
    superType: ReferenceType[];

    private _resolved: boolean = false;

    constructor(location: SymbolLocation, methods: InterfaceMethod[], superType: ReferenceType[] = []) {
        super(location, "interface");
        this.methods = methods;
        this.superType = superType;
    }

    shortname(): string {
        return "interface"
    }

    serialize(): string {
        let superType = this.superType.map((superType) => superType.serialize()).join(",");
        let methods = this.methods.map((method) => method.serialize()).join(",");
        return `@interface{${superType}:${methods}}`
    }

    resolve(ctx: Context) {
        if(this._resolved) return;
        
        // make sure all supertypes are resolved
        let superInterfaces: InterfaceType[] = [];
        this.superType.forEach((superType) => {
            superType.resolve(ctx);
            let interfaceSuper = superType.dereference();
            if(interfaceSuper == null) {
                ctx.parser.customError("Interface can only extend from other interfaces", superType.location);
                return;
            }

            if(!(interfaceSuper instanceof InterfaceType)) {
                ctx.parser.customError("Interface can only extend from other interfaces", superType.location);
                return;
            }

            superInterfaces.push(interfaceSuper);
        });

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
            allMethods = allMethods.concat(superInterface.methods);
        });

        this._allMethods = allMethods;

        /**
         * Checking for duplicated methods,
         * type-c support method overloading, as long as the argument types are different
         */
        let methodNames: string[] = allMethods.map((method) => method.name);
        let methodTypes: FunctionType[] = allMethods.map((method) => method.header);

        for(let i = 0; i < methodNames.length; i++){
            for(let j = i+1; j < methodNames.length; j++){
                if(methodNames[i] == methodNames[j]){
                    // we perform the check solely based on the arguments, not the return type
                    if(areSignaturesIdentical(ctx, methodTypes[i], methodTypes[j])){
                        ctx.parser.customError(`Method ${methodNames[i]} is duplicated`, allMethods[j].location);
                        return;
                    }
                }
            }
        }

        checkOverloadedMethods(ctx, allMethods);

        this._resolved = true;
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
}

export function checkOverloadedMethods(ctx: Context, methods: InterfaceMethod[]){
    methods.forEach((method) => {
        // make sure __inc__, __dec__, __neg__, __not__, __invert__ have no arguments
        if(["__inc__", "__dec__", "__neg__", "__not__", "__invert__"].includes(method.name)){
            if(method.header.parameters.length != 0){
                throw ctx.parser.customError(`Method ${method.name} cannot have arguments`, method.location);
            }
            if(method.isStatic){
                throw ctx.parser.customError(`Method ${method.name} cannot be static`, method.location);
            }
        }

        // make sure __index__ has at least one argument
        if(method.name == "__index__"){
            if(method.header.parameters.length == 0){
                throw ctx.parser.customError(`Method ${method.name} must have at least one argument`, method.location);
            }
            if(method.isStatic){
                throw ctx.parser.customError(`Method ${method.name} cannot be static`, method.location);
            }
        }

        if(method.name == "__index_set__"){
            if(method.header.parameters.length < 2){
                throw ctx.parser.customError(`Method ${method.name} must have at least two argument`, method.location);
            }
            if(method.isStatic){
                throw ctx.parser.customError(`Method ${method.name} cannot be static`, method.location);
            }
        }

        // make sure __mul__, __div__, __mod__, __add__, __sub__, __lshift__, __rshift__, __lt__, __le__, __gt__, __ge__, __band__, __xor__, __bor__, __and__, __or__ have exactly one argument
        if(["__mul__", "__div__", "__mod__", "__add__", "__sub__", "__lshift__", "__rshift__", "__lt__", "__le__", "__gt__", "__ge__", "__band__", "__xor__", "__bor__", "__and__", "__or__"].includes(method.name)){
            if(method.header.parameters.length != 1){
                throw ctx.parser.customError(`Method ${method.name} must have exactly one argument`, method.location);
            }
            if(method.isStatic){
                throw ctx.parser.customError(`Method ${method.name} cannot be static`, method.location);
            }
        }
    });
}