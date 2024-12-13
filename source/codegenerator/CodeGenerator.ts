import { BasePackage } from "../ast/BasePackage";
import { DeclaredFFI } from "../ast/symbol/DeclaredFFI";
import { DeclaredFunction, DeclaredOverloadedFunction } from "../ast/symbol/DeclaredFunction";
import { DeclaredType } from "../ast/symbol/DeclaredType";
import { DeclaredVariable } from "../ast/symbol/DeclaredVariable";
import { ClassType } from "../ast/types/ClassType";
import { TypeC } from "../compiler";
import { ControlFlowGraph } from "./analysis/ControlFlowGraph";
import { BytecodeInstructionType } from "./bytecode/BytecodeInstructions";
import { IRInstruction } from "./bytecode/IR";
import { BytecodeGenerator } from "./BytecodeGenerator";
import { FunctionGenerator } from "./FunctionGenerator";
import { BasicType } from "../ast/types/BasicType";
import { BlockStatement } from "../ast/statements/BlockStatement";
import { FunctionType } from "../ast/types/FunctionType";
import { FunctionPrototype } from "../ast/other/FunctionPrototype";
import { VoidType } from "../ast/types/VoidType";
import { LambdaDefinition } from "../ast/expressions/LambdaExpression";
import { getDataTypeByteSize } from "./utils";
import { BuiltinModules } from "../BuiltinModules";
import { matchDataTypes } from "../typechecking/TypeChecking";
import { ArrayType } from "../ast/types/ArrayType";

import * as path from "path";
import * as fs from "fs";
import { DeclaredNamespace } from "../ast/symbol/DeclaredNamespace";
import { DataType } from "../ast/types/DataType";
import { Context } from "../ast/symbol/Context";

export class CodeGenerator {
    functions: Map<string, FunctionGenerator> = new Map();
    bytecodeGenerator: BytecodeGenerator = new BytecodeGenerator();

    constructor() {}

    registerGlobalVariables(basePackage: BasePackage) {
        for (const [key, value] of basePackage.globalCtx.globalSymbols) {
            /**
             * We generate 2 kind of variables:
             *  - Regular Global variables: These are variables that are defined at the file level
             *  - Class Static variables: These are variables that are defined at the class level, but converted to bytecode-level global variables
             */
            if (value instanceof DeclaredVariable) {
                this.bytecodeGenerator.globalSegment.addVariable(value);
            } else if (value instanceof DeclaredType) {
                let baseType = value.type;
                if (baseType.is(value.parentContext, ClassType)) {
                    let classType = baseType.to(
                        value.parentContext,
                        ClassType,
                    ) as ClassType;
                    // look up static variables
                    let staticVariables = classType
                        .getAttributes()
                        .filter((attr) => attr.isStatic);
                    for (const staticVariable of staticVariables) {
                        this.bytecodeGenerator.globalSegment.addVariable(
                            staticVariable,
                        );
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
                let dynlibName = sym.sharedObjectName + "\0";
                let dynLibID = sym.ffiId;

                let nameConstPos =
                    this.bytecodeGenerator.constantSegment.addConstant({
                        byteSize: 1, // array, each element is 1 byte
                        arrayValue: Array.from(
                            encoder.encode(dynlibName),
                        ) as number[],
                    });
                    
                this.bytecodeGenerator.codeSegment.emit(
                    BytecodeInstructionType.reg_ffi,
                    nameConstPos,
                    dynLibID,
                );
            }
        }
    }

    generateGlobalContext(basePackage: BasePackage) {
        /**
         * We treat global scope as a function with no arguments and no return value
         * Also we do not generate a label for it
         */
        let emptyLoc = {
            col: 0,
            line: 0,
            file: "<<built-in>>",
            length: 0,
            pos: 0,
        };
        let block = new BlockStatement(emptyLoc, basePackage.ctx, []);

        let typeMap: { [key: string]: DataType } = {};
        let fnGlobal = new DeclaredFunction(
            emptyLoc,
            basePackage.ctx.clone(typeMap, basePackage.ctx), // we have to clone because DeclaredFunction needs to override owner
            new FunctionPrototype(
                emptyLoc,
                "",
                new FunctionType(emptyLoc, [], new VoidType(emptyLoc)),
                [],
            ),
            null,
            block,
        );

        let globalScope = new FunctionGenerator(
            fnGlobal,
            this.bytecodeGenerator.templateSegment,
            true,
        );
        
        // we assign statements later to avoid local scope stack length analysis
        block.statements = [...basePackage.statements, ...basePackage.namespaceStatements, ...basePackage.staticClassBlocks];
        globalScope.generate();
        this.bytecodeGenerator.generateBytecode(globalScope);
    }

    generateFunctions(basePackage: BasePackage) {
        /**
         * Functions includes:
         *  - Global functions
         *  - Lambdas
         *  - Class methods
         */
        for (const [key, sym] of basePackage.globalCtx.globalSymbols) {
            if(sym instanceof DeclaredNamespace){
                // namespace content is stored in the global context
                // so are the assignments of variables declared in the namespace
                continue;
            }
            if (sym instanceof DeclaredOverloadedFunction) {
                for (const [key, concreteSym] of sym.overloadedFunctions) {
                    let generator = new FunctionGenerator(
                        concreteSym,
                        this.bytecodeGenerator.templateSegment,
                    );
                    generator.generate();
                    this.functions.set(concreteSym.uid, generator);
                    this.bytecodeGenerator.generateBytecode(generator);
                }
            }
            if (sym instanceof DeclaredFunction) {
                // check if it is generic
                if (!sym.isGeneric()) {
                    let generator = new FunctionGenerator(
                        sym,
                        this.bytecodeGenerator.templateSegment,
                    );
                    generator.generate();
                    this.functions.set(sym.uid, generator);
                    this.bytecodeGenerator.generateBytecode(generator);
                } else {
                    for (const [key, concreteSym] of sym.concreteGenerics) {
                        let generator = new FunctionGenerator(
                            concreteSym,
                            this.bytecodeGenerator.templateSegment,
                        );
                        generator.generate();
                        this.functions.set(concreteSym.uid, generator);
                        this.bytecodeGenerator.generateBytecode(generator);
                    }
                }
            } else if (sym instanceof LambdaDefinition) {
                let generator = new FunctionGenerator(
                    sym,
                    this.bytecodeGenerator.templateSegment,
                );
                generator.generate();
                this.functions.set(sym.uid, generator);
                this.bytecodeGenerator.generateBytecode(generator);
            } else if (sym instanceof DeclaredType) {
                let baseType = sym.type;
                // just in case
                if (sym.genericParameters.length == 0) {
                    baseType.resolve(sym.parentContext);
                }

                if (baseType instanceof ClassType) {
                    this.generateClassStaticMethods(baseType);
                    // call getAllMethods to generate all methods
                    if (sym.isGeneric()) {
                        for (const [key, concreteSym] of sym.concreteTypes) {
                            if (concreteSym instanceof ClassType) {
                                this.generateClassMethods(concreteSym);
                            }
                        }
                    } else {
                        this.generateClassMethods(baseType);
                    }
                }
            }
        }
    }

    generateClassStaticMethods(type: ClassType) {
        let methods = type.getAllStaticMethods();
        for (const method of methods) {
            if (method.needsInfer()) {
                method.infer(method.context);
            }
            let generator = new FunctionGenerator(
                method,
                this.bytecodeGenerator.templateSegment,
            );
            generator.generate();
            this.functions.set(method.uid, generator);
            this.bytecodeGenerator.generateBytecode(generator);
        }
    }
    generateClassMethods(type: ClassType) {
        let methods = type.getAllNonStaticMethods();
        for (const method of methods) {
            let generator = new FunctionGenerator(
                method,
                this.bytecodeGenerator.templateSegment,
            );
            generator.generate();
            this.functions.set(method.uid, generator);
            this.bytecodeGenerator.generateBytecode(generator);
        }
    }

    /**
     * Generates the call main instruction,
     * checks the return type and the arguments of the main function
     * @param basePackage 
     */
    generateCallMain(basePackage: BasePackage) {
        let main = basePackage?.ctx.lookup("main");
        if (!main || !(main instanceof DeclaredFunction)) {
            throw new Error("No main function found");
        }
        // make sure main either returns a void or an int, less than 32 bits
        let mainHasReturn = 0;
        let mainRequireArgs = false;

        if (main.prototype.header.returnType.is(main.context, BasicType)) {
            let basic = main.prototype.header.returnType.to(main.context, BasicType) as BasicType;
            // make sure it is either void u8, i8, u16, i16, u32, i32
            if (["u8", "i8", "u16", "i16", "u32", "i32"].includes(basic.kind)) {
                mainHasReturn = getDataTypeByteSize(basic);
            } else {
                throw basePackage.ctx.parser.customError(
                    "main function must return a void or u32/i32 or smaller integer",
                    main.location,
                );
            }
        } else if (main.prototype.header.returnType instanceof VoidType) {
            mainHasReturn = 0;
        } else {
            throw basePackage.ctx.parser.customError(
                "main function must return a void or u32/i32 or smaller integer",
                main.location,
            );
        }

        if (main.prototype.header.parameters.length > 0) {
            mainRequireArgs = true;

            // make sure main requires only one argument
            if (main.prototype.header.parameters.length != 1) {
                throw basePackage.ctx.parser.customError(
                    "main function must take exactly one argument",
                    main.location,
                );
            }

            // make sure the argument is of type String
            let argType = main.prototype.header.parameters[0].type;
            let res = matchDataTypes(
                main.context,
                argType,
                new ArrayType(
                    main.prototype.header.parameters[0].location,
                    BuiltinModules.String!,
                ),
            );
            if (!res.success) {
                throw basePackage.ctx.parser.customError(
                    `main function argument must be a String[]. ${res.message}`,
                    main.location,
                );
            }
        }


        this.bytecodeGenerator.emitCallMain(
            main.context.uuid,
            mainHasReturn,
            mainRequireArgs,
        );
    }

    wrapBytecode() {
        this.bytecodeGenerator.resolveLabels();
    }

    encodeProgram(): Buffer {
        return this.bytecodeGenerator.encodeProgram();
    }

    generateSourceMap(path: string) {
        return this.bytecodeGenerator.generateSourceMap(path);
    }

    generateCFG() {
        let funcs: FunctionGenerator[] = [];
        this.functions.forEach((fn) => {
            funcs.push(fn);
        });
        let cfg = new ControlFlowGraph(funcs);
        return cfg.generateDotGraph();
    }

    dump(save_debug = false) {
        // save the instructions to a file
        let dir = "./output/ir.txt";

        // join all functions into one array
        let all: IRInstruction[] = [];
        this.functions.forEach((fn) => {
            all = all.concat(fn.instructions);
        });

        fs.writeFileSync(
            dir,
            all
                .map((inst) => {
                    if (inst.type == "fn")
                        return " \n \n \n\n" + inst.toString();
                    if (inst.type == "debug" && !save_debug) return "";
                    if (inst.type == "srcmap_push_loc") return "";
                    if (inst.type == "srcmap_pop_loc") return "";
                    return inst.toString();
                })
                .filter((str) => str != "")
                .join("\n"),
        );
    }
}

export function generateCode(compiler: TypeC.TCCompiler) {
    let generator = new CodeGenerator();
    Context.InferenceMode = "codegen";

    // it is import to perform the code generation in this order!

    // 1. register global variables (will not generate any bytecode. Just collect information & allocated global variables)
    // 2. generate FFI
    // 3. generate global context
    // 4. generate call main
    // 5. generate functions

    // iterate over all packages and register global variables & generate FFI
    for (let [key, value] of compiler.packageBaseContextMap) {
        generator.registerGlobalVariables(value);
        generator.generateFFI(value);
    }

    // generate global context
    for(let [key, value] of compiler.packageBaseContextMap){
        generator.generateGlobalContext(value);
    }

    generator.generateCallMain(compiler.basePackage!);

    for (let [key, value] of compiler.packageBaseContextMap) {
        generator.generateFunctions(value);
    }

    if (compiler.options.generateIR) {
        generator.dump(true);
        let data = generator.generateCFG();
        //toFile(data, path.join(compiler.options.outputFolder || ".",'graph.png'), { format: 'png' });

        data.forEach((d) => {
            let basedir = path.join(compiler.options.outputFolder || ".", "ir");

            let dir = path.join(basedir, d.name + ".dot");
            let folder = path.dirname(dir);

            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder, { recursive: true });
            }

            fs.writeFileSync(dir, d.graph);
        });
    }

    generator.wrapBytecode();

    let buffer = generator.encodeProgram();

    // check if output folder exists:
    if (compiler.options.outputFolder) {
        if (!fs.existsSync(compiler.options.outputFolder)) {
            fs.mkdirSync(compiler.options.outputFolder, { recursive: true });
        }
    }

    let bin_outputFile = path.join(
        compiler.options.outputFolder || ".",
        "/bin.tcv",
    );
    fs.writeFileSync(bin_outputFile, buffer);

    let src_map_outputFile = path.join(
        compiler.options.outputFolder || ".",
        "/src_map.map.txt",
    );
    generator.generateSourceMap(src_map_outputFile);

    let instructions = generator.bytecodeGenerator.codeSegment.toJSON();
    fs.writeFileSync(
        path.join(compiler.options.outputFolder || ".", "/program.json"),
        JSON.stringify(instructions, (key, value) =>
            typeof value === "bigint" ? value.toString() : value,
        ),
    );

    return [
        path.join(process.cwd(), bin_outputFile),
        path.join(process.cwd(), src_map_outputFile),
    ];
}
