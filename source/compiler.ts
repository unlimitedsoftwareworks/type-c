import * as fs from 'fs';
import { Lexer } from './lexer/Lexer';
import { promisify } from 'util';

import * as path from 'path';
import { BasePackage } from './ast/BasePackage';
import { Parser } from './parser/Parser';

export function readFile(filename: string): string {
    return fs.readFileSync(filename, 'utf-8');
}


export module TypeC {
    export interface CompileOptions {
        dir: string;
        generateBinaries: boolean;
        outputFolder?: string;
        runOutput: boolean;
        generateIR: boolean;
    }

    export class TCCompiler {
        target: "runnable" | "library" = "runnable";
        entry: string = "index.tc";
        dir: string = "";
        static stdlibDir: string = "../stdlib/";
        rawConfig: any = {};
        options: CompileOptions = { dir: "", generateBinaries: true, outputFolder: "bin", runOutput: true, generateIR: false }
        basePackage: BasePackage | null = null;

        // map from url to package source
        packageSourceMap: Map<string, string> = new Map();

        // map from package to the baseRoot of the package
        packageScopeMap: Map<string, BasePackage> = new Map();

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
            this.packageSourceMap.set(path, data);
            return data;
        }

        compile() {
            // start with index
            let entry = path.join(this.dir, this.entry);
            let entrySource = this.readPackage(entry);
            let lexer = new Lexer(entry, entrySource);
            lexer.filepath = entry;
            let parser = new Parser(lexer, entry);
            this.basePackage = parser.basePackage
            parser.parse();
            this.basePackage.infer();
        }
    }

    export const compile = (options: CompileOptions) => {
        let compiler = TCCompiler.create(options);
        compiler.compile();

        return 0
    }
}