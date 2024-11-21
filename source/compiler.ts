import * as fs from "fs";
import { Lexer } from "./lexer/Lexer";

import * as path from "path";
import { BasePackage } from "./ast/BasePackage";
import { Parser, ParserMode } from "./parser/Parser";
import { ImportNode } from "./ast/ImportNode";
import { BuiltinModules } from "./BuiltinModules";
import { generateCode } from "./codegenerator/CodeGenerator";
import { spawnSync } from "child_process";
import { colors } from "./utils/termcolors";
import { getStdLibPath } from "./cli/stdlib";

export function readFile(filename: string): string {
    return fs.readFileSync(filename, "utf-8");
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
        static stdlibDir: string = getStdLibPath();
        rawConfig: any = {};
        options: CompileOptions = {
            dir: "",
            generateBinaries: true,
            outputFolder: "bin",
            runOutput: true,
            generateIR: false,
            noWarnings: false,
        };
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

        /*
         * if mode is intellisense and content is set, it used over the file,
         * this is used by vscode extention to process unsaved file content
         */
        compile(mode: ParserMode = "compiler", content?: string) {
            console.log("Compiling ", this.dir);
            // start with index
            let entry = path.join(this.dir, this.entry);
            let entrySource = this.readPackage(entry);
            let lexer = new Lexer(
                entry,
                mode == "intellisense" && content ? content : entrySource,
            );
            lexer.filepath = entry;
            let parser = new Parser(
                lexer,
                entry,
                mode,
                !this.options.noWarnings,
            );
            this.basePackage = parser.basePackage;
            parser.parse();

            let entryKey = normalizePath(entry);
            this.packageBaseContextMap.set(entryKey, this.basePackage);

            this.importStringIfNeeded(this.basePackage)

            for (let imp of this.basePackage.imports) {
                let base = this.resolveImport(imp);
                if (!base) {
                    parser.customError(
                        `Could not resolve import ${imp.basePath.join("/")}`,
                        imp.location,
                    );
                }

                let sym = base.ctx.lookup(imp.actualName);
                if (!sym) {
                    parser.customError(
                        `Could not find symbol ${imp.actualName} in ${imp.basePath.join("/")}`,
                        imp.location,
                    );
                    continue;
                }

                this.basePackage.ctx.addExternalSymbol(sym, imp.alias);
            }

            this.basePackage.infer();
        }

        resolveImport(imp: ImportNode) {
            let filepath: string | null = "";
            for (let base of imp.basePath) {
                filepath = path.join(filepath, base);
            }
            filepath += ".tc";

            filepath = this.searchPackage(filepath);

            if (filepath == null) {
                throw new Error(`Could not find module '${filepath}'`);
            }

            let key = normalizePath(filepath);
            if (this.packageBaseContextMap.has(key)) {
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

            /*
             * The base String class is injected into the base package
             * as long as the package is not string.tc file itself!
             */
            let searchString="std/string.tc"
            if(!filepath.includes(searchString)){
                this.importStringIfNeeded(basePackage)
            }

            // resolve imports
            for (let imp of basePackage.imports) {
                let base = this.resolveImport(imp);
                if (!base) {
                    parser.customError(
                        `Could not resolve import ${imp.basePath.join("/")}`,
                        imp.location,
                    );
                }

                let sym = base.ctx.lookup(imp.actualName);
                if (!sym) {
                    parser.customError(
                        `Could not find symbol ${imp.actualName} in ${imp.basePath.join("/")}`,
                        imp.location,
                    );
                    continue;
                }

                basePackage.ctx.addExternalSymbol(sym, imp.alias);
            }

            basePackage.infer();
            return basePackage;
        }

        searchPackage(filepath: string): string | null {
            // first we check if the file exists relative to the current folder
            // if all fails, we look into deps folder
            // otherwise we check if it exists in the stdlib

            let pathInModule = path.join(this.dir, filepath);
            if (fs.existsSync(pathInModule)) {
                return pathInModule;
            }

            let pathInDeps = path.join(this.dir, "deps", filepath);
            if (fs.existsSync(pathInDeps)) {
                return pathInDeps;
            }

            let pathInStdlib = path.join(TCCompiler.stdlibDir, filepath);
            if (fs.existsSync(pathInStdlib)) {
                return pathInStdlib;
            }

            return null;
        }

        importStringIfNeeded(basePackage: BasePackage) {
            // check if std.string.String is imported:
            for (let i = 0; i < basePackage.imports.length; i++) {
                let imp = basePackage.imports[i];
                if ((imp.basePath.join("/") == "std/string") && (imp.actualName == "String") && (imp.alias == "String")) {
                    return;
                }
            }

            // if not, add it

            BuiltinModules.getStringClass(this);
            basePackage.imports.push(BuiltinModules.stringImport);
        }

        generateBytecode() {
            return generateCode(this);
        }
    }

    export const compile = (options: CompileOptions) => {
        // make sure all env variables are set
        if (!TCCompiler.stdlibDir) {
            throw new Error(
                "stdlib path not found, please use `typec stdlib install` to install the stdlib",
            );
        }

        if (options.runOutput) {
            if (process.env.TYPE_V_PATH == undefined) {
                throw new Error(
                    "--run argument requires TYPE_V_PATH environment variable to be set, please set it to the path of the type_v binary folder",
                );
            }
        }

        let compiler = TCCompiler.create(options);
        compiler.compile();

        if (options.generateBinaries) {
            let [binFile, srcMapFile] = compiler.generateBytecode();
            if (options.runOutput) {
                let interpreterPath = process.env.TYPE_V_PATH!;

                const command = `cd ${interpreterPath} && ./type_v ${binFile} ${srcMapFile}`;

                const result = spawnSync(command, { shell: true });

                if (result.stdout) {
                    console.log(colors.BgBlue, "stdout: ", colors.Reset);
                    console.log(result.stdout.toString());
                }
                if (result.stderr) {
                    console.log(colors.BgRed, "stderr: ", colors.Reset);
                    console.log(result.stderr.toString());
                }
                process.exit(result.status || 0);
            }
        }
        process.exit(0);
    };
}
