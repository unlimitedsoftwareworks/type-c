import * as fs from 'fs';
import { Lexer } from './lexer/Lexer';
import { promisify } from 'util';

import * as path from 'path';
import { BasePackage } from './ast/BasePackage';
import { Parser } from './parser/Parser';
import { ImportNode } from './ast/ImportNode';
import { BuiltinModules } from './BuiltinModules';
import { generateCode } from './codegenerator/CodeGenerator';
import { spawnSync } from 'child_process';
import { colors } from './utils/termcolors';

export function readFile(filename: string): string {
    return fs.readFileSync(filename, 'utf-8');
}

function normalizePath(filePath: string): string {
    return path.resolve(filePath).toLowerCase();
}



export module TypeC {
    export interface CompileOptions {
        dir: string;
        generateBinaries: boolean;
        outputFolder?: string;
        runOutput: boolean;
        generateIR: boolean;
        noWarnings: boolean;
    }

    export class TCCompiler {
        target: "runnable" | "library" = "runnable";
        entry: string = "index.tc";
        dir: string = "";
        static stdlibDir: string = "../stdlib/";
        rawConfig: any = {};
        options: CompileOptions = { dir: "", generateBinaries: true, outputFolder: "bin", runOutput: true, generateIR: false, noWarnings: false }
        basePackage: BasePackage | null = null;

        // map from url to package source
        packageSourceMap: Map<string, string> = new Map();

        // map from package to the baseRoot of the package
        packageBaseContextMap: Map<string, BasePackage> = new Map();

        static create(options: CompileOptions) {
            let moduleFile = readFile(options.dir + "/module.json");
            let config = JSON.parse(moduleFile);

            let compilerConfig = new TCCompiler();
            compilerConfig.options = options;

            compilerConfig.dir = options.dir;
            compilerConfig.target = config.compiler.target;
            compilerConfig.entry = config.compiler.entry;
            compilerConfig.rawConfig = config;

            return compilerConfig;
        }

        setOptions(options: Partial<CompileOptions>) {
            this.options = { ...this.options, ...options };
        }

        readPackage(path: string) {
            let data = readFile(path);
            let key = normalizePath(path);
            this.packageSourceMap.set(key, data);
            return data;
        }

        compile() {
            // start with index
            let entry = path.join(this.dir, this.entry);
            let entrySource = this.readPackage(entry);
            let lexer = new Lexer(entry, entrySource);
            lexer.filepath = entry;
            let parser = new Parser(lexer, entry, "compiler", !this.options.noWarnings);
            this.basePackage = parser.basePackage
            parser.parse();


            let entryKey = normalizePath(entry);
            this.packageBaseContextMap.set(entryKey, this.basePackage);

            //et sym = BuiltinModules.getStringClass(this);
            //BuiltinModules.getRunnableInterface(this);
            //BuiltinModules.getArrayInterface(this);
            
            // add built-in symbols

            let importString = BuiltinModules.getStringClass(this);
            this.basePackage.imports.push(BuiltinModules.stringImport);

            for(let imp of this.basePackage.imports) {
                let base = this.resolveImport(imp);
                if(!base) {
                    throw parser.customError(`Could not resolve import ${imp.basePath.join("/")}`, imp.location);
                }

                let sym = base.ctx.lookup(imp.actualName);
                if(!sym) {
                    throw parser.customError(`Could not find symbol ${imp.actualName} in ${imp.basePath.join("/")}`, imp.location);
                }

                this.basePackage.ctx.addExternalSymbol(sym, imp.alias);
            }

            this.basePackage.infer();
        }

        resolveImport(imp: ImportNode) {
            let filepath = this.dir;
            for(let base of imp.basePath) {
                filepath = path.join(filepath, base)
            }
            filepath += ".tc";

            // first we check if the file exists relative to the current folder
            // otherwise we check if it exists in the stdlib

            if(!fs.existsSync(filepath)) {
                filepath = TCCompiler.stdlibDir;
                for(let base of imp.basePath) {
                    filepath = path.join(filepath, base)
                }
                filepath += ".tc"

                if (!fs.existsSync(filepath)) {
                    throw new Error(`Could not find module '${filepath}'`);
                }
            }

            let key = normalizePath(filepath);
            if(this.packageBaseContextMap.has(key)) {
                return this.packageBaseContextMap.get(key)!;
            }

            let data = this.readPackage(filepath);
            let lexer = new Lexer(filepath, data);
            lexer.filepath = filepath;
            let parser = new Parser(lexer, filepath);
            let basePackage = parser.basePackage;
            parser.parse();

            key = normalizePath(filepath);
            this.packageBaseContextMap.set(key, basePackage);

            // resolve imports
            for(let imp of basePackage.imports) {
                let base = this.resolveImport(imp);
                if(!base) {
                    throw parser.customError(`Could not resolve import ${imp.basePath.join("/")}`, imp.location);
                }

                let sym = base.ctx.lookup(imp.actualName);
                if(!sym) {
                    throw parser.customError(`Could not find symbol ${imp.actualName} in ${imp.basePath.join("/")}`, imp.location);
                }

                basePackage.ctx.addExternalSymbol(sym, imp.alias);
            }

            basePackage.infer();
            return basePackage;
        }

        generateBytecode() {
            return generateCode(this);
        }
    }

    export const compile = (options: CompileOptions) => {
        let compiler = TCCompiler.create(options);
        compiler.compile();

        if (options.generateBinaries) {
            let [binFile, srcMapFile] = compiler.generateBytecode();
            if (options.runOutput) {
                let interpreterPath = "/Users/praisethemoon/projects/type-c/type-v/cmake-build-debug/";
                const command = `cd ${interpreterPath} && ./type_v ${binFile} ${srcMapFile}`;
                
                const result = spawnSync(command, { shell: true });

                if(result.stdout){
                    console.log(colors.BgBlue, "stdout: ", colors.Reset);
                    console.log(result.stdout.toString());
                }
                if(result.stderr){
                    console.log(colors.BgRed, "stderr: ", colors.Reset);
                    console.log(result.stderr.toString());
                }
                process.exit(result.status || 0);
            }
        }
        process.exit(0);
    }
}