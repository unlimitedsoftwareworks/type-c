#!/usr/bin/env node

import { TypeC } from "./compiler";
import { initProject } from "./cli/init";
import {
    downloadAndInstallStdLib,
    getStdLibPath,
    updateStdLib,
} from "./cli/stdlib";

const args = process.argv.slice(2); // Remove the first two elements

const compilerVersion = "0.0.1";

interface RunTestsOptions {
    // Add specific options for the run-tests command here
}

function parseCompileOptions(args: string[]): TypeC.CompileOptions {
    const compileIndex = args.findIndex(
        (arg) => arg === "--compile" || arg === "-c"
    );
    const dir =
        compileIndex !== -1 && args[compileIndex + 1]
            ? args[compileIndex + 1]
            : "";

    const generateBinaries = !args.includes("--no-generate-binaries");

    const outputIndex = args.findIndex(
        (arg) => arg === "--output" || arg === "-o"
    );
    const outputFolder =
        outputIndex !== -1 && args[outputIndex + 1]
            ? args[outputIndex + 1]
            : "default_output_folder";

    const runIndex = args.findIndex((arg) => arg === "--run" || arg === "-r");
    const runOutput = runIndex !== -1;
    
    // Capture all arguments after --run or -r
    const typevArgs = runIndex !== -1 ? args.slice(runIndex + 1) : [];

    const generateIR = args.includes("--generate-ir") || args.includes("-g");

    const noWarnings = args.includes("--no-warnings") || args.includes("-nw");

    return {
        dir,
        generateBinaries,
        outputFolder,
        runOutput,
        generateIR,
        noWarnings,
        typevArgs, // Include the extracted arguments here
    };
}


function parseRunTestsOptions(args: string[]): RunTestsOptions {
    // Parse options specific to the run-tests command
    return {};
}

function printHelp() {
    console.log(`
Type-c compiler, version ${compilerVersion}.
Usage: type-c <command> [options]
        --run-tests             Run all unit test
        --compile <dir>         Compile a directory
        --no-generate-binaries  Do not generate binaries
        --output <dir>          Output folder
        --run                   Run the generated output
        --generate-ir           Generate IR and DOT files
        --no-warnings           Do not show warnings
        init [folder]           Initialize a new project at the given folder
        stdlib install          Install the standard library from git
        stdlib update           Updates the standard library from git
        stdlib where            Prints the path to the standard library
    `);
}

// Main logic to determine which command to run
if (args.includes("--help") || args.includes("-h")) {
    printHelp();
} else if (args[0] === "init") {
    const folder = args[1] || "."; // Default to the current directory if no folder is provided
    initProject(folder);
} else if (args[0] === "stdlib") {
    if (args[1] === "install") {
        downloadAndInstallStdLib();
    } else if (args[1] === "update") {
        updateStdLib();
    } else if (args[1] === "where") {
        console.log(getStdLibPath());
    } else {
        console.log("Invalid command. Use 'install' or 'update'");
    }
} else if (args.includes("--run-tests")) {
    // const options = parseRunTestsOptions(args);
    //let code = TypeC.runTests();
    //exit(code)
    throw new Error("Not implemented yet");
} else if (args.includes("--compile") || args.includes("-c")) {
    const options = parseCompileOptions(args);
    TypeC.compile(options);
} else {
    console.log("Invalid command. Use '--run-tests' or '--compile <dir>'");
}
