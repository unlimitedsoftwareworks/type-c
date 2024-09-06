import { BasePackage } from "../ast/BasePackage";
import { ClassMethod } from "../ast/other/ClassMethod";
import { DeclaredFFI } from "../ast/symbol/DeclaredFFI";
import { DeclaredFunction } from "../ast/symbol/DeclaredFunction";
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

    constructor() { }

    registerGlobalVariables(basePackage: BasePackage) {
        for (const [key, value] of basePackage.globalCtx.globalSymbols) {
            /**
             * We generate 2 kind of variables:
             *  - Regular Global variables: These are variables that are defined at the file level
             *  - Class Static variables: These are variables that are defined at the class level, but converted to bytecode-level global variables
             */
            if (value instanceof DeclaredVariable) {
                this.bytecodeGenerator.globalSegment.addVariable(value);
            }

            else if (value instanceof DeclaredType) {
                let baseType = value.type;
                if (baseType.is(value.parentContext, ClassType)) {
                    let classType = baseType.to(value.parentContext, ClassType) as ClassType;
                    // look up static variables
                    let staticVariables = classType.getAttributes().filter(attr => attr.isStatic);
                    for (const staticVariable of staticVariables) {
                        this.bytecodeGenerator.globalSegment.addVariable(staticVariable);
                    }
                }
            }
        }
    }

    generateFFI(basePackage: BasePackage) {
        let symbols = basePackage.globalCtx.globalSymbols;
        let encoder = new TextEncoder();

        for (const [key, sym] of symbols) {
            // skip symbols that are not in the current package
            if (sym.parentContext?.uuid != basePackage.ctx.uuid) {
                continue;
            }

            if (sym instanceof DeclaredFFI) {
                let dynlibName = sym.sharedObjectName + '\0'
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

    generateFunctions(basePackage: BasePackage) {
        /**
         * Functions includes:
         *  - Global functions
         *  - Lambdas
         *  - Class methods
         */
        for (const [key, sym] of basePackage.globalCtx.globalSymbols) {
            if (sym instanceof DeclaredFunction) {
                // check if it is generic
                if (!sym.isGeneric()) {
                    let generator = new FunctionGenerator(sym);
                    generator.generate();
                    this.functions.set(sym.uid, generator);
                }
                else {
                    for (const [key, concreteSym] of sym.concreteGenerics) {
                        let generator = new FunctionGenerator(concreteSym);
                        generator.generate();
                        this.functions.set(concreteSym.uid, generator);
                    }
                }
            }
            else if (sym instanceof DeclaredType) {
                let baseType = sym.type;
                if (baseType instanceof ClassType) {

                    if (sym.isGeneric()) {
                        for (const [key, concreteSym] of sym.concreteTypes) {
                            if (concreteSym instanceof ClassType) {
                                this.generateClassMethods(concreteSym);
                            }
                        }
                    }
                    else {
                        this.generateClassMethods(baseType);
                    }
                }
            }
        }
    }

    generateClassMethods(type: ClassType) {
        let methods = type.getAllMethods();
        for (const method of methods) {
            let generator = new FunctionGenerator(method);
            generator.generate();
            this.functions.set(method.uid, generator);
        }
    }

}

export function generateCode(compiler: TypeC.TCCompiler) {
    let generator = new CodeGenerator();

    // iterate over all packages and register global variables
    for (let [key, value] of compiler.packageBaseContextMap) {
        console.log(`Registering global variables for ${key}`);
        generator.registerGlobalVariables(value);
        console.log(`Generating FFI for ${key}`);
        generator.generateFFI(value);
        console.log(`Generating functions for ${key}`);
        generator.generateFunctions(value);
    }

    console.log(generator.functions);
}