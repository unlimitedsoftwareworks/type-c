import { ImportNode } from "./ast/ImportNode";
import { DeclaredType } from "./ast/symbol/DeclaredType";
import { SymbolLocation } from "./ast/symbol/SymbolLocation";
import { DataType } from "./ast/types/DataType";
import { ReferenceType } from "./ast/types/ReferenceType";
import { TypeC } from "./compiler";

export class BuiltinModules {
    /** Imports */
    static stringImport: ImportNode = new ImportNode(new SymbolLocation("<<stdin>>", 0,0,0), ["std", "string"], "String", "String");
    
    /** Symbols */
    static String: DataType | null = null;

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
}