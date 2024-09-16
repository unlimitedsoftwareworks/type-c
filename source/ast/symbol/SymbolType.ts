import { LambdaExpression } from "../expressions/LambdaExpression";
import { ClassAttribute } from "../other/ClassAttribute";
import { ClassMethod } from "../other/ClassMethod";
import { DataType } from "../types/DataType";
import { DeclaredFunction } from "./DeclaredFunction";
import { DeclaredVariable } from "./DeclaredVariable";
import { FunctionArgument } from "./FunctionArgument";
import { Symbol } from "./Symbol";
import { VariablePattern } from "./VariablePattern";

export function getSymbolType(sym: Symbol): DataType {
    if(sym instanceof DeclaredVariable){
        return sym.annotation!;
    }
    if(sym instanceof DeclaredFunction){
        return sym.prototype.header;
    }
    else if (sym instanceof VariablePattern){
        return sym.type!;
    }
    else if (sym instanceof ClassAttribute){
        return sym.type;
    }
    else if (sym instanceof FunctionArgument){
        return sym.type;
    }
    else if (sym instanceof ClassMethod){
        return sym.imethod.header;
    }
    else if (sym instanceof LambdaExpression){
        return sym.header
    }
    throw new Error("Invalid symbol type");
}