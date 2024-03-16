import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {InterfaceType} from "./InterfaceType";
import { Context } from "../symbol/Context";
import { InterfaceMethod } from "../other/InterfaceMethod";


export class JoinType extends DataType {
    left: DataType;
    right: DataType;

    methods: InterfaceMethod[] = [];
    interfaceType: InterfaceType | null = null;

    private _resolved: boolean = false;
    
    constructor(location: SymbolLocation, left: DataType, right: DataType) {
        super(location, "join");

        this.left = left;
        this.right = right;
    }

    resolve(ctx: Context){
        if(!this.left.is(ctx, InterfaceType) && !this.left.is(ctx, JoinType)){
            throw new Error("Left side of join must be either interface or join");
        }

        if(!this.right.is(ctx, InterfaceType) && !this.right.is(ctx, JoinType)){
            throw new Error("Right side of join must be either interface or join");
        }
        
        this.left.resolve(ctx);
        this.right.resolve(ctx);

        this.methods = this.flatten(ctx);

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

    flatten(ctx: Context): InterfaceMethod[] {
        
        let leftInterface = this.left.to(ctx, InterfaceType) as InterfaceType;
        let rightInterface = this.right.to(ctx, InterfaceType) as InterfaceType;

        let methods: InterfaceMethod[] = [];

        for(let method of leftInterface.methods){
            methods.push(method);
        }

        for(let method of rightInterface.methods){
            methods.push(method);
        }

        return methods;
    }

    shortname(): string {
        return "join"
    }

    serialize(): string {
        return `@join{lhs:${this.left.serialize()},rhs:${this.right.serialize()}}`
    }

    is(ctx: Context, targetType: new (...args: any[]) => DataType): boolean {
        if(targetType === JoinType) return true;
        if(targetType === InterfaceType) return true;
        return false;
    }

    to(ctx: Context, targetType: new (...args: any[]) => DataType): DataType {
        if(targetType === JoinType) return this;
        if(targetType === InterfaceType) return this.interfaceType!;
        throw new Error("Invalid cast");
    }

    allowedNullable(ctx: Context): boolean {
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

        let isLHSPromise = false;
        let isRHSPromise = false;

        if(this.left.is(ctx, JoinType)){
            let lhs: JoinType = this.left.to(ctx, JoinType) as JoinType;
            isLHSPromise = lhs.isPromise(ctx);
        }
        else {
            let lhs: InterfaceType = this.left.to(ctx, InterfaceType) as InterfaceType;
            isLHSPromise = lhs.isPromise(ctx);
        }

        if(isLHSPromise) return true;

        if(this.right.is(ctx, JoinType)){
            let rhs: JoinType = this.right.to(ctx, JoinType) as JoinType;
            isRHSPromise = rhs.isPromise(ctx);
        }
        else {
            let rhs: InterfaceType = this.right.to(ctx, InterfaceType) as InterfaceType;
            isRHSPromise = rhs.isPromise(ctx);
        }

        return isLHSPromise || isRHSPromise;
    }


    getPromiseType(ctx: Context): DataType | null {

        let lhsPromiseType: DataType | null = null;
        let rhsPromiseType: DataType | null = null;

        if(this.left.is(ctx, JoinType)){
            let lhs: JoinType = this.left.to(ctx, JoinType) as JoinType;
            lhsPromiseType = lhs.getPromiseType(ctx);
        }
        else {
            let lhs: InterfaceType = this.left.to(ctx, InterfaceType) as InterfaceType;
            lhsPromiseType = lhs.getPromiseType(ctx);
        }

        if(lhsPromiseType !== null) return lhsPromiseType;

        if(this.right.is(ctx, JoinType)){
            let rhs: JoinType = this.right.to(ctx, JoinType) as JoinType;
            rhsPromiseType = rhs.getPromiseType(ctx);
        }
        else {
            let rhs: InterfaceType = this.right.to(ctx, InterfaceType) as InterfaceType;
            rhsPromiseType = rhs.getPromiseType(ctx);
        }

        return rhsPromiseType;
    }


    clone(genericsTypeMap: {[key: string]: DataType}): JoinType{
        return new JoinType(this.location, this.left.clone(genericsTypeMap), this.right.clone(genericsTypeMap));
    }
}