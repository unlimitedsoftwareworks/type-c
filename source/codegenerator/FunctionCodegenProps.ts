import { Context } from "../ast/symbol/Context";
import { FunctionArgument } from "../ast/symbol/FunctionArgument";
import { Symbol } from "../ast/symbol/Symbol";
import { SymbolLocation } from "../ast/symbol/SymbolLocation";
import { ClassType } from "../ast/types/ClassType";
import { FunctionType } from "../ast/types/FunctionType";

/**
 * This class represents the code generation properties for a declared function
 */
export class FunctionCodegenProps {

    // local symbols
    localSymbols: Map<string, Symbol> = new Map();

    // arguments
    argSymbols: Map<string, Symbol> = new Map();

    // registered arg symbols
    usedArgSymbols: Map<string, Symbol> = new Map();

    // upvalues (for closures)
    upvalues: Map<string, Symbol> = new Map();

    /**
     * if the function is a class method, "this" will need to be passed as an argument
     */
    _this: FunctionArgument | null = null;

    constructor() {
        // nothing todo here yet
    }

    /**
     * Makes sure that the symbol has a UID
     * @param sym 
     */
    assertSymbolUID(sym: Symbol) {
        if(sym.uid === ""){
            throw new Error("Symbol does not have a UID");
        }
    }

    registerLocalSymbol(sym: Symbol) {
        this.assertSymbolUID(sym);
        this.localSymbols.set(sym.uid, sym);
    }

    registerArgSymbol(sym: Symbol) {
        this.assertSymbolUID(sym);
        this.argSymbols.set(sym.uid, sym);
    }

    registerUpvalue(sym: Symbol) {
        this.assertSymbolUID(sym);
        this.upvalues.set(sym.uid, sym);
    }

    markArgSymbolAsUsed(sym: Symbol) {
        this.assertSymbolUID(sym);
        this.usedArgSymbols.set(sym.uid, sym);
    }

    /**
     * After a function has been inferred, it is possible that some symbols are not used,
     * which means that they are not present in the codegen properties, hence this method
     * is used to report unused symbols
     */
    reportUnusedSymbols(ctx: Context, header: FunctionType) {
        // check for unused symbols
        for(const sym of header.parameters){
            if(!this.usedArgSymbols.has(sym.uid)){
                ctx.parser.customWarning(`Unused argument ${sym.name}`, sym.location);
            }
        }
    }

    assignThis(cl: ClassType, location: SymbolLocation) {
        this._this = new FunctionArgument(location, "$this", cl, true);
        this._this.uid = "$this";
    }
}