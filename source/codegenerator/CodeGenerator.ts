import { BasePackage } from "../ast/BasePackage";
import { DeclaredFFI } from "../ast/symbol/DeclaredFFI";
import { DeclaredType } from "../ast/symbol/DeclaredType";
import { DeclaredVariable } from "../ast/symbol/DeclaredVariable";
import { ClassType } from "../ast/types/ClassType";
import { TypeC } from "../compiler";
import { BytecodeInstructionType } from "./bytecode/BytecodeInstructions";
import { BytecodeGenerator } from "./BytecodeGenerator";
import { FunctionGenerator } from "./FunctionGenerator";


export class CodeGenerator {
    functions: Map<string, FunctionGenerator> = new Map();
    
    bytecodeGenerator: BytecodeGenerator = new BytecodeGenerator();


    constructor() {}

    registerGlobalVariables(basePackage: BasePackage){
        for(const [key, value] of basePackage.globalCtx.globalSymbols){
            /**
             * We generate 2 kind of variables:
             *  - Regular Global variables: These are variables that are defined at the file level
             *  - Class Static variables: These are variables that are defined at the class level, but converted to bytecode-level global variables
             */
            if(value instanceof DeclaredVariable){
                this.bytecodeGenerator.globalSegment.addVariable(value);
            }

            else if(value instanceof DeclaredType){
                let baseType = value.type;
                if (baseType.is(value.parentContext, ClassType)) {
                    let classType = baseType.to(value.parentContext, ClassType) as ClassType;
                    // look up static variables
                    let staticVariables = classType.getAttributes().filter(attr => attr.isStatic);
                    for(const staticVariable of staticVariables){
                        this.bytecodeGenerator.globalSegment.addVariable(staticVariable);
                    }
                }
            }
        }
    }

    generateFFI(basePackage: BasePackage){
        let symbols = basePackage.globalCtx.globalSymbols;
        let encoder = new TextEncoder();

        for (const [key, sym] of symbols) {
            // skip symbols that are not in the current package
            if (sym.parentContext?.uuid != basePackage.ctx.uuid) {
                continue;
            }

            if(sym instanceof DeclaredFFI){
                let dynlibName = sym.sharedObjectName+'\0'
                let dynLibID = sym.ffiId

                let nameConstPos = this.bytecodeGenerator.constantSegment.addConstant({
                    byteSize: 1, // array, each element is 1 byte
                    arrayValue: Array.from(encoder.encode(dynlibName)) as number[]
                })
                console.log(`Registering FFI ${dynlibName} with FFI ID ${dynLibID} at constant segment position ${nameConstPos}`);
                this.bytecodeGenerator.codeSegment.emit(BytecodeInstructionType.reg_ffi, nameConstPos, dynLibID);
            }
        }
    }
}

export function generateCode(compiler: TypeC.TCCompiler){
    let generator = new CodeGenerator();

    // iterate over all packages and register global variables
    for(let [key, value] of compiler.packageBaseContextMap) {
        console.log(`Registering global variables for ${key}/${value.ctx.parser.lexer.filepath}`);
        generator.registerGlobalVariables(value);
        generator.generateFFI(value);
    }
}