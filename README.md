
<img align="center" src='assets/logo.png' width='100%'>
<br/>

<hr/>

Type-C is an expressive multi-paradigm programming language with emphasis on type safety and run-time performance. This repository contains the Type-C compiler, which can be installed by cloning this repo or installing it via npm (in progress).

For the Virtual Machine, please refer to the [Type-V Project](https://github.com/unlimitedsoftwareworks/type-v)

## Show some code!
![tc-snippet.png](assets/snippet.png)

## Getting started:

Setting up Type-C requires the following steps:
1. Installing Type-C source through source or npm
2. Installing the Type-V VM & building it from source
3. Optional: VSCode Syntax Highlighting: in [https://marketplace.visualstudio.com/items?itemName=unlimitedsoftwareworks.type-c-language-support](https://marketplace.visualstudio.com/items?itemName=unlimitedsoftwareworks.type-c-language-support)

To get started, please have a look at the documentation: [https://typec.praisethemoon.org/docs/getting-started](https://typec.praisethemoon.org/docs/getting-started)

## CLI Usage:
After installing type-c either via npm `npm install -g @unlimitedsoftwareworks/type-c` or by cloning this repo, you can use the `typec` command to compile your code.

```bash
$ typec --help
Type-c compiler, version ${compilerVersion}.
Usage: type-c <command> [options]
        --run-tests             Run all unit test
        --compile <dir>         Compile a directory
        --no-generate-binaries  Do not generate binaries
        --output <dir>          Output folder
        --run                   Run the generated output
        --generate-ir           Generate IR and DOT files
        --no-warnings           Do not show warnings
        init <folder>           Initialize a new project at the given folder
        stdlib install          Install the standard library from git
        stdlib update           Updates the standard library from git
        stdlib where            Prints the path to the standard library
```

`stdlib` will be installed in your `~/.type-c/stdlib` and used as the default search path for the standard library.

## Project Status
Very immature. Cryptic error messages. Everything you can expect from a compiler that is not even in alpha.

Keep an eye on https://typec.praisethemoon.org/posts for updates

## Documentation
Official docs: https://typec.praisethemoon.org/docs/introduction

## Need help
Head over to the discussion section, and start a discussion. **Please do not open an issue, start with a discussion and if the issue is verified (or a feature request is accepted), then we will create an issue.** Thank you!

## I want to help
Right now the best way to help is the test the language and give feedback.
