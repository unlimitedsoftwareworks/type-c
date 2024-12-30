import { Lexer } from "./lexer/Lexer";
import { BasePackage } from "./ast/BasePackage";
import { Parser, ParserMode } from "./parser/Parser";
import { ImportNode } from "./ast/ImportNode";
import { BuiltinModules } from "./BuiltinModules";
import { generateCode } from "./codegenerator/CodeGenerator";
import { colors } from "./utils/termcolors";
import { getStdLibPath, initStdLib } from "./cli/stdlib";
import { DeclaredNamespace } from "./ast/symbol/DeclaredNamespace";
import { Symbol } from "./ast/symbol/Symbol";

/**
 * Safely imports Node.js specific modules
 */
const nodeModules = {
    fs: typeof window === "undefined" ? require("fs") : null,
    path: typeof window === "undefined" ? require("path") : null,
    spawnSync: typeof window === "undefined" ? require("child_process").spawnSync : null
};

/**
 * Safe file reading that works in both Node.js and web
 */
export function readFile(filename: string): string {
    if (!nodeModules.fs) {
        throw new Error("File system operations are only available in Node.js environment");
    }
    return nodeModules.fs.readFileSync(filename, "utf-8");
}

/**
 * Safe path normalization that works in both Node.js and web
 */
function normalizePath(filePath: string): string {
    if (!nodeModules.path) {
        // Simple fallback for web
        return filePath.toLowerCase();
    }
    return nodeModules.path.resolve(filePath).toLowerCase();
}

export module TypeC {
    export interface CompileOptions {
        dir: string;
        generateBinaries: boolean;
        outputFolder?: string;
        runOutput: boolean;
        generateIR: boolean;
        noWarnings: boolean;
        typevArgs: string[];
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
            typevArgs: [],
        };
        basePackage: BasePackage | null = null;

        // map from url to package source
        packageSourceMap: Map<string, string> = new Map();

        // map from package to the baseRoot of the package
        packageBaseContextMap: Map<string, BasePackage> = new Map();

        static create(options: CompileOptions) {
            let config: any = {};
            try {
                let moduleFile = readFile(options.dir + "/module.json");
                config = JSON.parse(moduleFile);
            }
            catch(e){
                console.log(colors.BgRed, "Error reading module.json", colors.Reset);
                console.log(colors.BgRed, e, colors.Reset);
                process.exit(1);
            }

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
            initStdLib();
            
            console.log("Compiling ", this.dir);
            // start with index
            let entry = nodeModules.path.join(this.dir, this.entry);
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


            /**
             * Imports main transformer to load the arguments
             */
            this.importMainArgsTransformers(this.basePackage, entry)
            this.importArrayIteratorInterfaceIfNeeded(this.basePackage, entry)
            this.importStringIfNeeded(this.basePackage, entry)

            for (let imp of this.basePackage.imports) {
                let base = this.resolveImport(imp);
                TCCompiler.registerImport(base, imp, parser, this.basePackage, base.ctx.location.file);
            }

            this.basePackage.infer();
        }

        resolveImport(imp: ImportNode) {
            let filepath: string | null = "";
            for (let base of imp.basePath) {
                filepath = nodeModules.path.join(filepath, base);
            }
            filepath += ".tc";

            filepath = this.searchPackage(filepath ?? "");

            if (filepath == null) {
                throw new Error(`Could not find module ${imp.basePath.join("/")}`);
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
            this.importStringIfNeeded(basePackage, filepath)
            this.importArrayIteratorInterfaceIfNeeded(basePackage, filepath)

            // resolve imports
            for (let imp of basePackage.imports) {
                let base = this.resolveImport(imp);
                TCCompiler.registerImport(base, imp, parser, basePackage, filepath);
            }

            basePackage.infer();
            return basePackage;
        }

        searchPackage(filepath: string): string | null {
            // first we check if the file exists relative to the current folder
            // if all fails, we look into deps folder
            // otherwise we check if it exists in the stdlib

            let pathInModule = nodeModules.path.join(this.dir, filepath);
            if (nodeModules.fs.existsSync(pathInModule)) {
                return pathInModule;
            }

            let pathInDeps = nodeModules.path.join(this.dir, "deps", filepath);
            if (nodeModules.fs.existsSync(pathInDeps)) {
                return pathInDeps;
            }

            let pathInStdlib = nodeModules.path.join(TCCompiler.stdlibDir, filepath);
            if (nodeModules.fs.existsSync(pathInStdlib)) {
                return pathInStdlib;
            }

            return null;
        }

        checkIfImportExists(basePackage: BasePackage, name: string, alias: string, actualName: string) {
            for (let i = 0; i < basePackage.imports.length; i++) {
                let imp = basePackage.imports[i];
                if ((imp.basePath.join("/") == name) && (imp.actualName == actualName) && (imp.alias == alias)) {
                    return true;
                }
            }
            return false;
        }

        importStringIfNeeded(basePackage: BasePackage, filepath: string) {
            if(filepath.includes("std/string.tc")){
                return;
            }
            // check if std.string.String is imported:
            if(this.checkIfImportExists(basePackage, "std/string", "String", "String")){
                return;
            }

            // if not, add it
            BuiltinModules.getStringClass(this);
            basePackage.imports.push(BuiltinModules.stringImport);
        }

        importMainArgsTransformers(basePackage: BasePackage, filepath: string) {
            BuiltinModules.getMainArgTransformer(this);
            basePackage.imports.push(BuiltinModules.argsTransformerImport);
        }

        importArrayIteratorInterfaceIfNeeded(basePackage: BasePackage, filepath: string) {
            if(filepath.includes("std/collections/iterator.tc")){
                return;
            }
            if(this.checkIfImportExists(basePackage, "std/collections/iterator", "ArrayIterator", "ArrayIterator")){
                return;
            }

            BuiltinModules.getArrayIteratorInterface(this);
            basePackage.imports.push(BuiltinModules.arrayIteatorInterfaceImport);
        }

        generateBytecode() {
            return generateCode(this);
        }

        static registerImport(importBase: BasePackage, imp: ImportNode, parser: Parser, basePackage: BasePackage, filepath: string) {
            if (!basePackage) {
                parser.customError(
                    `Could not resolve import ${imp.basePath.join("/")}`,
                    imp.location,
                );
            }

            let sym: Symbol | null = null;


            if(imp.subImports.length > 0){
                let initialPkg = imp.subImports.shift()!;
                sym = importBase.ctx.lookup(initialPkg);
                
                const checkSym = () => {
                    if(!sym){
                        parser.customError(`Could not find symbol ${initialPkg} in ${imp.basePath.join("/")}`, imp.location);
                    }
                    if(!(sym instanceof DeclaredNamespace)){
                        parser.customError(`Sub imports are only allowed from within a namespace. Attempting to import ${initialPkg} from ${imp.basePath.join("/")}`, imp.location);
                    }
                    if(sym!.isLocal){
                        parser.customError(`Cannot import local symbol. Attempting to import local symbol ${initialPkg}.`, imp.location);
                    }
                }

                checkSym();

                for(let subImport of imp.subImports){
                    sym = (sym as DeclaredNamespace).ctx.lookup(subImport);
                    checkSym();
                }

                // finally we import the final symbol
                sym = (sym as DeclaredNamespace).ctx.lookup(imp.actualName);
                if(!sym){
                    parser.customError(`Could not find symbol ${imp.actualName} in ${imp.basePath.join("/")}`, imp.location);
                }
            }
            else if (imp.actualName === "*"){
                // import all symbols
                for(let sym of importBase.ctx.getSymbols()){
                    if(sym.isLocal || importBase.ctx.isSymbolExternal(sym.uid, false)){
                        continue;
                    }
                    basePackage.ctx.addExternalSymbol(sym, sym.name);
                    
                }
                return;
            }
            else {
                sym = importBase.ctx.lookup(imp.actualName);
                if (!sym) {
                    parser.customError(
                        `Could not find symbol ${imp.actualName} in ${imp.basePath.join("/")}`,
                        imp.location,
                    );
                    return;
                }
            }


            if(sym!.isLocal){
                parser.customError(`Cannot import local symbol. Attempting to import local symbol ${imp.actualName}.`, imp.location)
            }

            basePackage.dependencies.push(filepath);
            basePackage.ctx.addExternalSymbol(sym!, imp.alias);
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
            if (!nodeModules.spawnSync) {
                throw new Error("Running output is only available in Node.js environment");
            }
            let interpreterPath = process.env.TYPE_V_PATH!;

            const command = `cd ${interpreterPath} && ./typev /Users/praisethemoon/projects/type-c/type-c/output/bin.tcv ${options.typevArgs.join(" ")}`;

            const result = nodeModules.spawnSync(command, { shell: true });

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

        let compiler = TCCompiler.create(options);
        compiler.compile();

        if (options.generateBinaries) {
            let [binFile, srcMapFile] = compiler.generateBytecode();
            if (options.runOutput) {
                let interpreterPath = process.env.TYPE_V_PATH!;

                const command = `cd ${interpreterPath} && ./typev /Users/praisethemoon/projects/type-c/type-c/output/bin.tcv ${options.typevArgs.join(" ")}`;

                const result = nodeModules.spawnSync(command, { shell: true });

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
