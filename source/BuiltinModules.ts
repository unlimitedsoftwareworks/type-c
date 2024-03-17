import { ImportNode } from "./ast/ImportNode";
import { DeclaredType } from "./ast/symbol/DeclaredType";
import { SymbolLocation } from "./ast/symbol/SymbolLocation";
import { DataType } from "./ast/types/DataType";
import { TypeC } from "./compiler";

export class BuiltinModules {
    /** Imports */
    static runnableImport: ImportNode = new ImportNode(new SymbolLocation("<<stdin>>", 0,0,0), ["std", "concurrency", "runnable"], "Runnable", "Runnable");
    static stringImport: ImportNode = new ImportNode(new SymbolLocation("<<stdin>>", 0,0,0), ["std", "string"], "String", "String");
    static arrayImport: ImportNode = new ImportNode(new SymbolLocation("<<stdin>>", 0,0,0), ["std", "array"], "Array", "Array");

    /** Symbols */
    static Runnable: DataType | null = null;
    static String: DataType | null = null;
    static Array: DataType | null = null;

    static getRunnableInterface(compiler: TypeC.TCCompiler): DataType{
        if(BuiltinModules.Runnable != null){
            return BuiltinModules.Runnable;
        }
        let base = compiler.resolveImport(BuiltinModules.runnableImport);
        if(base == null){
            throw new Error("Could not find built-in interface 'Runnable'");
        }
        let sym = base.ctx.lookup("Runnable");
        if(sym == null){
            throw new Error("Could not find built-in interface 'Runnable'");
        }
        if(!(sym instanceof DeclaredType)){
            throw new Error("Could not find built-in interface 'Runnable'");
        }
        BuiltinModules.Runnable = sym.type;
        return sym.type;
    }

    static getStringClass(compiler: TypeC.TCCompiler): DataType {
        if(BuiltinModules.String != null){
            return BuiltinModules.String;
        }
        let base = compiler.resolveImport(BuiltinModules.stringImport);
        if(base == null){
            throw new Error("Could not find built-in interface 'String'");
        }
        let sym = base.ctx.lookup("String");
        if(sym == null){
            throw new Error("Could not find built-in interface 'String'");
        }
        if(!(sym instanceof DeclaredType)){
            throw new Error("Could not find built-in interface 'String'");
        }
        BuiltinModules.String = sym.type;
        return sym.type;
    }

    static getArrayInterface(compiler: TypeC.TCCompiler): DataType {
        if(BuiltinModules.Array != null){
            return BuiltinModules.Array;
        }
        let base = compiler.resolveImport(BuiltinModules.arrayImport);
        if(base == null){
            throw new Error("Could not find built-in interface 'Array'");
        }
        let sym = base.ctx.lookup("Array");
        if(sym == null){
            throw new Error("Could not find built-in interface 'Array'");
        }
        if(!(sym instanceof DeclaredType)){
            throw new Error("Could not find built-in interface 'Array'");
        }
        BuiltinModules.Array = sym.type;
        return sym.type;
    }
}