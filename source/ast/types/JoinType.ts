import {DataType} from "./DataType";
import {SymbolLocation} from "../symbol/SymbolLocation";
import {InterfaceType} from "./InterfaceType";
import { Context } from "../symbol/Context";


export class JoinType extends DataType {
    left: DataType;
    right: DataType;
    
    constructor(location: SymbolLocation, left: DataType, right: DataType) {
        super(location, "join");
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

        // TODO: check if can be combined
    }

    shortname(): string {
        return "join"
    }

    serialize(): string {
        return `@join{lhs:${this.left.serialize()},rhs:${this.right.serialize()}}`
    }
}