/**
 * Filename: Parser.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Parses the tokens through lexer and generates an AST
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Token } from "../lexer/Token";
import { BasePackage } from "../ast/BasePackage";
import { Lexer } from "../lexer/Lexer";
import { SymbolLocation } from "../ast/symbol/SymbolLocation";
import { colors } from "../utils/termcolors";
import * as parsefuncs from "./parsefuncs";

/**
 * A parser mode is either "compiler" or "intellisense".
 * Intellisense mode is used when the parser is used for VSCode intellisense.
 * In this mode, the parser will not throw errors, but instead accumulate them in a list,
 * and the list of errors can be queried at the end of the parsing process.
 */
export type ParserMode = "compiler" | "intellisense";

export type CompilerLogs = {
    type: "error" | "warning" | "info";
    message: string;
    line: number;
    column: number;
    file: string;
    length: number;
};

export class Parser {
    // current package name
    // e.g std.io
    package: string;

    tokenStack: Token[] = [];
    stackIndex: number = 0;

    basePackage: BasePackage;
    lexer: Lexer;

    mode: ParserMode = "compiler";
    logs: CompilerLogs[] = [];

    constructor(lexer: Lexer, pkg: string, mode: ParserMode = "compiler") {
        this.package = pkg;
        this.lexer = lexer;
        this.mode = mode;
        this.basePackage = new BasePackage(this);
    }

    peek(): Token {
        if (this.stackIndex == this.tokenStack.length) {
            let token = this.lexer.nextToken();
            this.tokenStack.push(token);
            this.stackIndex++;
            return token;
        } else {
            this.stackIndex++;
            return this.tokenStack[this.stackIndex - 1];
        }
    }

    accept() {
        this.tokenStack.splice(0, this.stackIndex);
        this.stackIndex = 0;
    }

    reject() {
        this.stackIndex = 0;
    }
    /**
     * Rejects only one element, used internally within the parser itself
     */
    rejectOne() {
        this.stackIndex--;
        if (this.stackIndex < 0) this.stackIndex = 0;
    }

    /**
     * Asserts that a given token type is the next token in the stream.
     * If it is, it returns the token. Otherwise, it throws an error.
     * Same as peek + assert + accept
     * @param type
     * @returns
     */
    expect(type: string): Token {
        let token = this.peek();
        if (this.mode == "compiler") {
            this.assert(
                token.type === type,
                `Expected '${type}' but got '${token.type}'`,
            );
        } else {
            if (token.type !== type) {
                this.logs.push({
                    type: "error",
                    message: `Expected '${type}' but got '${token.type}'`,
                    line: token.location.line,
                    column: token.location.col,
                    length: token.value.length,
                    file: token.location.file,
                });
            }
        }

        this.accept();
        return token;
    }

    /**
     * Used by imports to allow keywords to be used as identifiers
     * @param condition
     * @param message
     */
    expectPackageName() {
        let regex = /^(?!_$)[a-zA-Z_][a-zA-Z0-9_]*/;
        let token: Token = this.peek();
        // makesure token is a valid identifier
        if (this.mode == "compiler") {
            this.assert(
                regex.test(token.value),
                `Expected package name but got '${token.type}'`,
            );
        } else {
            if (!regex.test(token.value)) {
                this.logs.push({
                    type: "error",
                    message: `Expected package name but got '${token.type}'`,
                    line: token.location.line,
                    column: token.location.col,
                    length: token.value.length,
                    file: token.location.file,
                });
            }
        }

        this.accept();
        return token;
    }

    assert(condition: boolean, message: string) {
        if (!condition) {
            throw this.error(message);
        }
    }

    customError(message: string, location: SymbolLocation, length: number = 1): never {
        throw this.error(
            message,
            {
                line: location.line,
                col: location.col,
                pos: location.pos,
            },
            length,
        );
    }

    error(
        message: string,
        coords?: { line: number; col: number; pos: number },
        tokenLength: number = 1,
    ) {
        // get current active lexeme without changing the stack

        let token: Token | { line: number; col: number; pos: number } | null =
            null;
        if (this.stackIndex > 0) {
            token = this.tokenStack[this.stackIndex - 1];
        } else {
            token = this.peek();
        }

        let coordinates = {
            line: token.location.line,
            col: token.location.col,
            pos: token.location.pos,
        };

        if (coords) {
            coordinates = coords;
        }

        this.logs.push({
            type: "error",
            message: message,
            line: coordinates?.line,
            column: coordinates?.col,
            length: tokenLength,
            file: this.lexer.filepath || "<stdin>",
        });

        // draw ^^^^^ under the token

        //  extract the line where the token is, starting from the current pos backtowards the beginning of the line
        let lineContent = "";
        let lineStart = coordinates.pos;
        while (lineStart > 0 && this.lexer.data[lineStart] != "\n") {
            lineStart--;
        }
        // now line end
        let lineEnd = coordinates.pos;
        while (
            lineEnd < this.lexer.data.length &&
            this.lexer.data[lineEnd] != "\n"
        ) {
            lineEnd++;
        }

        // get the line
        lineContent = this.lexer.data.substring(lineStart, lineEnd);
        // remove new lines from lineContent
        lineContent = lineContent.replace(/\n/g, "");

        let msg = message + "\n" + lineContent + "\n";
        if (!coords) {
            msg += " ".repeat(coordinates.col) + "^".repeat(token.value.length);
        } else {
            msg += " ".repeat(coordinates.col) + "^".repeat(tokenLength);
        }
        msg += "\n";

        console.log(
            colors.FgRed + colors.Underscore + colors.Bright,
            `Compiler Error: ${message}`,
        );
        console.log(colors.Reset);
        console.log(
            `${this.lexer.filepath || "<stdin>"}:${coordinates.line + 1}:${coordinates.col + 1}:${msg}`,
        );

        return new Error(message);
    }


    warning(message: string, coords?: { line: number, col: number, pos: number }, tokenLength: number=1) {
        // get current active lexeme without changing the stack
        // get current active lexeme without changing the stack
        

        let token: Token | { line: number, col: number, pos: number } | null = null;
        if (this.stackIndex > 0) {
            token = this.tokenStack[this.stackIndex - 1];
        }
        else {
            token = this.peek();
        }
        
        let coordinates = { line: token.location.line, col: token.location.col, pos: token.location.pos };

        if(coords) {
            coordinates = coords;
        }

        this.logs.push({
            type: "warning",
            file: this.lexer.filepath || "<stdin>",
            message: message,
            line: coordinates.line,
            column: coordinates.col,
            length: tokenLength
        });

        // draw ^^^^^ under the token

        //  extract the line where the token is, starting from the current pos backtowards the beginning of the line
        let lineContent = "";
        let lineStart = coordinates.pos;
        while (lineStart > 0 && this.lexer.data[lineStart] != "\n") {
            lineStart--;
        }
        // now line end
        let lineEnd = coordinates.pos;
        while (lineEnd < this.lexer.data.length && this.lexer.data[lineEnd] != "\n") {
            lineEnd++;
        }

        // get the line
        lineContent = this.lexer.data.substring(lineStart, lineEnd);
        // remove new lines from lineContent
        lineContent = lineContent.replace(/\n/g, "");

        let msg = message + '\n' + lineContent + "\n";
        if(!coords) {
            msg += " ".repeat(coordinates.col) + "^".repeat(token.value.length);
        }
        else {
            msg += " ".repeat(coordinates.col) + "^".repeat(tokenLength)
        }
        msg += "\n";

        console.log(`${this.lexer.filepath || "<stdin>"}:${coordinates.line + 1}:${coordinates.col + 1}:${msg}`);
    }

    customWarning(message: string, location: SymbolLocation, extraLogs: {msg: string, loc: SymbolLocation}[] = []) {
        console.log(colors.FgYellow + colors.Underscore + colors.Bright, `Compiler Warning: ${message}`)
        console.log(colors.Reset)
        this.warning(message, {line: location.line, col: location.col, pos: location.pos}, 1);
        for(let log of extraLogs){
            this.warning(log.msg, {line: log.loc.line, col: log.loc.col, pos: log.loc.pos}, 1);
        }
    }

    loc(): SymbolLocation {
        let token = this.peek();
        this.rejectOne();
        return token.location;
    }

    /**
     * Starts the parsing process
     */
    parse() {
        var token = this.peek();
        while (token.type != "EOF") {
            switch (token.type) {
                case "import":
                    this.reject();
                    parsefuncs.parseImport(this);
                    break;
                case "from":
                    this.reject();
                    parsefuncs.parseFrom(this);
                    break;
                //case "strict":
                case "type":
                    this.reject();
                    parsefuncs.parseTypeDecl(this);
                    break;
                case "extern":
                    this.reject();
                    parsefuncs.parseFFI(this);
                    break;
                default:
                    {
                        this.reject();
                        let e = parsefuncs.parseStatement(this, this.basePackage.ctx);
                        //console.log(JSON.stringify(e.serialize()))
                        this.basePackage.addStatement(e);
                    }
            }
            token = this.peek();
        }
    }
}
