import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {InterfaceType} from "./InterfaceType";
import { Context } from "../symbol/Context";
import { InterfaceMethod } from "../other/InterfaceMethod";


export class JoinType extends DataType {
    left: InterfaceType | JoinType;
    right: InterfaceType | JoinType;

    methods: InterfaceMethod[] = [];
    interfaceType: InterfaceType | null = null;

    private _resolved: boolean = false;
    
    constructor(location: SymbolLocation, left: DataType, right: DataType) {
        super(location, "join");
        if(!(left instanceof InterfaceType || left instanceof JoinType)){
            throw new Error("Left side of join must be either interface or join");
        }

        if(!(right instanceof InterfaceType || right instanceof JoinType)){
            throw new Error("Right side of join must be either interface or join");
        }

        this.left = left;
        this.right = right;
    }

    resolve(ctx: Context){
        // make sure left is either join or interface
        if(!(this.left instanceof InterfaceType || this.left instanceof JoinType)){
            throw new Error("Left side of join must be either interface or join");
        }

        // make sure right is either join or interface
        if(!(this.right instanceof InterfaceType || this.right instanceof JoinType)){
            throw new Error("Right side of join must be either interface or join");
        }
        
        this.left.resolve(ctx);
        this.right.resolve(ctx);

        this.methods = this.flatten();

        // create a new interface type with the methods
        this.interfaceType = new InterfaceType(this.location, this.methods);
        this.interfaceType.resolve(ctx);

        this._resolved = true;
    }

    resolveIfNeeded(ctx: Context){
        if(!this._resolved){
            this.resolve(ctx);
        }
    }

    flatten(): InterfaceMethod[] {
        let methods: InterfaceMethod[] = [];
        if(this.left instanceof JoinType){
            methods = methods.concat(this.left.flatten());
        } else {
            methods = methods.concat(this.left.methods);
        }

        if(this.right instanceof JoinType){
            methods = methods.concat(this.right.flatten());
        } else {
            methods = methods.concat(this.right.methods);
        }

        return methods;
    }

    shortname(): string {
        return "join"
    }

    serialize(): string {
        return `@join{lhs:${this.left.serialize()},rhs:${this.right.serialize()}}`
    }

    is(targetType: new (...args: any[]) => DataType): boolean {
        if(targetType === JoinType) return true;
        if(targetType === InterfaceType) return true;
        return false;
    }

    toInterfaceType(): DataType {
        if(!this._resolved){
            throw new Error("Join type not resolved, call .resolve first");
        }

        return this.interfaceType!;
    }

    allowedNullable(): boolean {
        return true;
    }

    
    /**
     * Returns true if the reference type has a method with the given name
     * given that the reference is either a class or an interface, otherwise false
     */
    methodExists(ctx: Context, methodName: string): boolean {
        this.resolveIfNeeded(ctx);
        return this.interfaceType!.methodExists(ctx, methodName);
    }

    isPromise(ctx: Context): boolean {
        // recursively check lefts and rights, one is sufficient
        return this.left.isPromise(ctx) || this.right.isPromise(ctx);
    }


    getPromiseType(ctx: Context): DataType | null {
        return this.left.getPromiseType(ctx) || this.right.getPromiseType(ctx);
    }
}