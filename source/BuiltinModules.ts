import { ImportNode } from "./ast/ImportNode";
import { DeclaredFunction } from "./ast/symbol/DeclaredFunction";
import { DeclaredType } from "./ast/symbol/DeclaredType";
import { SymbolLocation } from "./ast/symbol/SymbolLocation";
import { DataType } from "./ast/types/DataType";
import { ReferenceType } from "./ast/types/ReferenceType";
import { TypeC } from "./compiler";

export class BuiltinModules {
    /** Imports */
    static stringImport: ImportNode = new ImportNode(new SymbolLocation("<<stdin>>", 0,0,0), ["std", "string"], "String", "String");
    static argsTransformerImport: ImportNode = new ImportNode(new SymbolLocation("<<stdin>>", 0,0,0), ["std", "compilerUtils", "transformArgs"], "$transformArgs", "transformArgs");
    static arrayIteatorInterfaceImport: ImportNode = new ImportNode(new SymbolLocation("<<stdin>>", 0,0,0), ["std", "collections", "iterator"], "ArrayIterator", "ArrayIterator");

    
    /** Symbols */
    static String: DataType | null = null;
    static transformArgs: DeclaredFunction | null = null;
    static ArrayIterator: DataType | null = null;

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
        BuiltinModules.String = new ReferenceType(sym.location, ["String"], [], base.ctx);
        return BuiltinModules.String;
    }

    /**
     * Gets the main argument transformer function
     * This is injected by the compiler to transform the arguments of the main function, 
     * because they are not actually passed by the VM but instead read as runtime 
     * environment variables, by stdcore library
     * 
     * This function is injectted into every main function. And only one main should be present in the program.
     * 
     * @param compiler 
     * @returns 
     */
    static getMainArgTransformer(compiler: TypeC.TCCompiler): DeclaredFunction {
        if(BuiltinModules.transformArgs != null){
            return BuiltinModules.transformArgs;
        }
        let base = compiler.resolveImport(BuiltinModules.argsTransformerImport);
        if(base == null){
            throw new Error("Could not find built-in interface 'String'");
        }
        let sym = base.ctx.lookup("transformArgs");
        if(sym == null){
            throw new Error("Could not find built-in interface 'String'");
        }
        BuiltinModules.transformArgs = sym as DeclaredFunction;
        return BuiltinModules.transformArgs;
    }

    static getArrayIteratorInterface(compiler: TypeC.TCCompiler): DataType {
        if(BuiltinModules.ArrayIterator != null){
            return BuiltinModules.ArrayIterator;
        }

        let base = compiler.resolveImport(BuiltinModules.arrayIteatorInterfaceImport);
        if(base == null){
            throw new Error("Could not find built-in interface 'ArrayIterator'");
        }
        let sym = base.ctx.lookup("ArrayIterator");
        if(sym == null){
            throw new Error("Could not find built-in interface 'ArrayIterator'");
        }
        if(!(sym instanceof DeclaredType)){
            throw new Error("Could not find built-in interface 'ArrayIterator'");
        }
        BuiltinModules.ArrayIterator = new ReferenceType(sym.location, ["ArrayIterator"], [], base.ctx);
        return BuiltinModules.ArrayIterator;
    }
}