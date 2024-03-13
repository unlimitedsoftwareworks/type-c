
import { exit } from 'process';
import { TypeC } from './compiler';

const args = process.argv.slice(2); // Remove the first two elements

const compilerVersion = "0.0.1";

interface RunTestsOptions {
    // Add specific options for the run-tests command here
    
}

function parseCompileOptions(args: string[]): TypeC.CompileOptions {

    const compileIndex = args.findIndex(arg => arg === '--compile' || arg === '-c');
    const dir = compileIndex !== -1 && args[compileIndex + 1] ? args[compileIndex + 1] : '';

    const generateBinaries = !args.includes('--no-generate-binaries');

    const outputIndex = args.findIndex(arg => arg === '--output' || arg === '-o');
    const outputFolder = outputIndex !== -1 && args[outputIndex + 1] ? args[outputIndex + 1] : 'default_output_folder';

    const runOutput = args.includes('--run') || args.includes('-r');

    const generateIR = args.includes('--generate-ir') || args.includes('-g');

    return { dir, generateBinaries, outputFolder, runOutput, generateIR };
}


function parseRunTestsOptions(args: string[]): RunTestsOptions {
    // Parse options specific to the run-tests command
    return {};
}

function printHelp(){
    console.log(`

    ████▓▓▓▓▓▓▓▒▓▓▓▓▒▓▓▓▓▓▓▓▓▓▒▓▓▓▓▓▓▓▓▓▒▓▓▓▓▓▓▒▓▓▓▓▓▓▓▓▓▒▓▓▓▓▓▒▓▓▓▓▓▒▓▓▓▓▓▓▓▒▓▓▓▓▓▓▓▓▒▓▓▓▓▒▓▓▓▓▓▓▓█████
    █▒██▒▒▒▒▒▒▒░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░▒▒▒▒▒▒░▒▒▒▒▒▒▒▒▒░▒▒▒▒▒░▒▒▒▒▓░▓▒▒▒▒▒▒░▒▒▒▒▒▒▒▒░▒▓▓▓▓████████████
    █▒██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ░░░░░░░░░░░░░░░░░░░░▓██████▓▒░░░  ░▓████
    █▒██▒▒▒▒▒▒▒░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░▒▒▒▒▒▒░▒▒▒▒▒▒▒▒▒░▒▒▒▒▒░▒▒▒▒▒░▒▒▒▒▒▒▒░▒▒▓█████▓             ████
    █▒██▒▒▒▒▒▒▒░▒▒▒▒▒▒▒▒▒▓▓▓██████▒▒▒▒▒▒░▒▒▒▒▒▒░▒▒▒▒▒▒▒▒▒░▒▒▒▒▒░▒▒▒▒▓▒▓▓█████████████▒             ░████
    █▒██▒▒▒▒▒▒▒░▓▓██████████▓▒▒▒██▒▒▒▒▒▒░▒▒▒▒▒▒░▒▒▒▒▒▒▒▒▒░▒▓▓███████████▓▒████░█░████░    ▒▒▓▓▒░   ░████
    █▓██▓███████████▒░░░       ▓█▓▒▒▒▒▒▒░▒▒▒▒▒▒░▒▒▓████████████▓▒░░░     ░██████████▓    ▒████▓    ▒████
    ███████▓▒░               ░░██▓▒▒▒▒▒▓▒▓██████████▓▒░░░▒████          ░░██████████▒   ░█████▓▒▒▓▓█████
    █████                ▒▓▓▓████████████████▒░░           ▓██    ░▒▒▓▓█████████████░   ░███████████████
    ████▓   ░░▒▒▒▓▓█░   ░████████████▒░   ▓██░      ░░     ▓██   ░▓█████▒███████████░   ░███████████████
    ████▒   ░███████░   ▒██▓    █████▒    ▓██    █████░    ▓█▒          ░███████▓▓██    ░███████▓▒██████
    ████▒   ▒██████▓    ▓██░   ░█████░   ░██▒   ░█████░    ██░    ░░░▒▒░▓██▒ ░░░░██▒    ▓███████████████
    ████▒▓▓████████▒    ███    ░█████░   ░██░   ░█████    ▒██░        ░░███░  ░░▒██░    ██████▓▒░░░█████
    ███████████████░    ███    ░████▓    ▓██    ▒█▒      ░▓█▓ ░░▒▒▒▓███████▓███████░   ░██████░   ░█████
    ███████████████░   ░██▓    ▒███▒    ░██▓░░░░▓█░   ░░▒▓██▓▒░▒▒▒███▓▒▒▒██████████░░  ░██████▒▒▒▒▓█████
    ███████████████    ▒██▓     ░░ ░    ▒██▓  ░░██░░▒▓██████▒▒▒░▒░▒▒▒░▒▒▓█████████▓▒▒▒▒▒█████░░░▒▒██████
    ██████████████▒    ███▓      ░▒    ░▓██▒▒▒▒▒██░░████████▒▒▒░▒▒▒▒▒▒▒▓██████████▓▒▒▒░▒░░░▒░▒▒▒▒▒████▓█
    ██████████████░░░░░█████▒░░▒▒░    ▒▓███▒░▒░▒████████████▒▒▓█████████▓▒░   ░░██▓▒▒▒▒▒▒░▒▒▒▒▒▒▒█████▒█
    ██████████████    ▒████████▓░   ░▒▓████░▒░▒▓██████████████▓▒▒░░  ░░▒▒▓█████████▒▒▒▒▒▒▒▒▒▒▒▓███████▒█
    █████████████▓▒▒▒░▓██████▓░    ▒▒█████▓▒▓▓███████▓▒░░░   ░▒▓███████████▓▓░▒▒▒▓██████████████▓▒▒▓██▒█
    █████████████▓▒▒▒▒██████░   ░░▒██████████▓▒░   ░░░▒▓██████████▓▒▒▒▒░▒▒▒▒▒░▒▒▒▒▒▒▓█▓█▓▒▒░▒▒▒▒▒▒▒▓██▒█
    █████████████▒▒▒▒▒███████▒░▒▒████▒░   ░░▒▒▓█████████▓▓▓▒▒▒▒░▒▒▒▒▒▒▒░▒▒▒▒▒░▒▒▒▒▒▒▒▓░▒▒▒▒░▒▒▒▒▒▒▒▓██▒█
    █████████████▒▓████████▓███████▒▒▓██████████▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒░▒▒▒▒▒▒▒░▒▒▒▓▒░▒▒▒▒▒▒▓▓░▒▒▒▓░▒▒▒▒▒▒▒▓██▒█
    ███████████████▓░      ░▒███████████▓▒▒░▒▒▒▒▒▒░▒▒▒▒▒▒▒▒▒▒▒▒░▒▒▒▒▒▒▒░▒▒▒▒▒░▒▒▒▒▒▒▒▒░▒▒▒▒░▒▒▒▒▒▒▒▓██▒█
    ██████▓▒▒░░░░░░▒▓██████████▓▓▒▒▒ ▒▒▒▒▒▒░▒▒▒▒▒▒░▒▒▒▒▒▒▒▒▒▒▒▒░▒▒▒▒▒▒▒░▒▒▒▒▒░▒▒▒▒▒▒▒▓░▒▒▒▒░▒▒▒▒▒▒▒▓██▒█

    
Type-c compiler, version ${compilerVersion}.
Usage: type-c <command> [options]
        --run-tests             Run all unit test
        --compile <dir>         Compile a directory
        --no-generate-binaries  Do not generate binaries
        --output <dir>          Output folder
        --run                   Run the generated output
        --generate-ir           Generate IR and DOT files
    `)
}

// Main logic to determine which command to run
if(args.includes('--help') || args.includes('-h')) {
    printHelp();
}
else if (args.includes('--run-tests')) {
    throw new Error("Not implemented yet");
    //const options = parseRunTestsOptions(args);
    //let code = TypeC.runTests();
    //exit(code)
} else if (args.includes('--compile') || args.includes('-c')) {
    const options = parseCompileOptions(args);
    TypeC.compile(options);
} else {
    console.log("Invalid command. Use '--run-tests' or '--compile <dir>'");
}
