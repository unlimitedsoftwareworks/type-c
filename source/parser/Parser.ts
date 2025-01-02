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
import { ParseMethods } from "./parsefuncs";
import { FunctionDeclarationStatement } from "../ast/statements/FunctionDeclarationStatement";
import { VariableDeclarationStatement } from "../ast/statements/VariableDeclarationStatement";
import { Context } from "../ast/symbol/Context";
import { TokenType } from "../lexer/TokenType";
import { Annotation } from "../annotations/Annotation";

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

    stateStack: string[] = [];

    tokenStack: Token[] = [];
    stackIndex: number = 0;

    basePackage: BasePackage;
    lexer: Lexer;

    pendingAnnotations: Annotation[] = [];

    mode: ParserMode = "compiler";

    lastReadToken: Token | null = null;
    lastSeenToken: Token | null = null;
    warn: boolean = true;

    constructor(lexer: Lexer, pkg: string, mode: ParserMode = "compiler", warn: boolean = true) {
        this.package = pkg;
        this.lexer = lexer;
        this.mode = mode;
        this.basePackage = new BasePackage(this);
        this.warn = warn;
    }

    pushState(state: string) {
        this.stateStack.push(state);
    }

    popState() {
        this.stateStack.pop();
    }

    /**
     * Compares the last token with the current one to see if they are on the same line
     */
    isOnANewLine(){
        return (this.lastReadToken)&&  this.lastSeenToken && (this.lastReadToken.location.line != this.lastSeenToken.location.line);
    }

    peek(): Token {
        if (this.stackIndex == this.tokenStack.length) {
            let token = this.lexer.nextToken();
            this.lastSeenToken = token;
            this.tokenStack.push(token);
            this.stackIndex++;
            return token;
        } else {
            this.stackIndex++;
            this.lastSeenToken = this.tokenStack[this.stackIndex - 1];
            return this.tokenStack[this.stackIndex - 1];
        }
    }

    accept() {
        this.lastReadToken = this.tokenStack[this.stackIndex - 1];
        this.lastSeenToken = null;
        this.tokenStack.splice(0, this.stackIndex);
        this.stackIndex = 0;
    }

    reject() {
        this.stackIndex = 0;
        this.lastSeenToken = null;
    }
    /**
     * Rejects only one element, used internally within the parser itself
     */
    rejectOne() {
        this.stackIndex--;
        if (this.stackIndex < 0) this.stackIndex = 0;
        this.lastSeenToken = this.tokenStack[this.stackIndex - 1] ?? null;
    }

    /**
     * Same as peek().type == type
     * Therefor must reject() if false
     * @param type
     * @returns
     */
    is(type: string) {
        return this.peek().type == type;
    }
    /**
     * Asserts that a given token type is the next token in the stream.
     * If it is, it returns the token. Otherwise, it throws an error.
     * Same as peek + assert + accept
     * @param type
     * @returns
     */
    expect(type: string | string[]): Token {
        let t = typeof type === "string" ? [type] : type;
        let token = this.peek();

        if(type == ">"){
            if(token.type == ">"){
                this.accept();
                return token;
            }
            else if (token.type == ">>"){
                // accept and and insert a new token
                let t1 = new Token(TokenType.TOK_GREATER, ">", token.location.pos+1, token.location.line, token.location.col+1, token.location.file)
                let t2 = new Token(TokenType.TOK_GREATER, ">", token.location.pos, token.location.line, token.location.col, token.location.file)
                this.accept();
                this.tokenStack.push(t2);
                return t1;
            }
        }

        if (this.mode == "compiler") {
            this.assert(
                t.includes(token.type),
                `Expected '${type}' but got '${token.type}'`,
            );
        } else {
            if (!t.includes(token.type)) {
                this.basePackage.logs.push({
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
                this.basePackage.logs.push({
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
        if (this.mode == "intellisense"){
            this.basePackage.logs.push({
                type: "error",
                message: message,
                line: location.line,
                column: location.col,
                length: length,
                file: location.file,
            });
        }
        throw this.error(
            message,
            {
                file: location.file,
                line: location.line,
                col: location.col,
                pos: location.pos,
            },
            length,
        );
    }

    error(
        message: string,
        coords?: { file: string,line: number; col: number; pos: number },
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
            file: token.location.file,
        };

        if (coords) {
            coordinates = coords;
        }

        this.basePackage.logs.push({
            type: "error",
            message: message,
            line: coordinates?.line,
            column: coordinates?.col,
            length: tokenLength,
            file: coordinates?.file || this.lexer.filepath || "<stdin>",
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
            `${coordinates.file}:${coordinates.line + 1}:${coordinates.col + 1}:${msg}`,
        );


        if(this.mode == "compiler") {
            throw new Error(message);
        }
    }


    warning(message: string, coords?: { line: number, col: number, pos: number }, tokenLength: number=1) {
        if(!this.warn) return;
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

        this.basePackage.logs.push({
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
        if(!this.warn) return;
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
    parse(ctx: Context | undefined = undefined) {
        if(ctx == undefined) {
            ctx = this.basePackage.ctx
        }

        let local = false;
        var token = this.peek();
        while (token.type != "EOF") {

            if(token.type == "local"){
                local = true;
                this.accept();
                token = this.peek();
                if (token.type == "let" || token.type == "import" || token.type == "from"){
                    // the syntax here is let local so we throw an error
                    this.customError("Invalid syntax, local is used prior to a declaration of a function/type or within let", token.location)
                }
            }
            switch (token.type) {
                case "import":
                    // import only allowed in the global scope
                    if(ctx != this.basePackage.ctx){
                        this.customError("Imports are only allowed on global context", token.location)
                    }
                    this.reject();
                    ParseMethods.parseImport(this);
                    break;
                case "from":
                    // from only allowed in the global scope
                    if(ctx != this.basePackage.ctx){
                        this.customError("Imports are only allowed on global context", token.location)
                    }
                    this.reject();
                    ParseMethods.parseFrom(this);
                    break;

                case "namespace":
                    this.reject();
                    let ns = ParseMethods.parseNamespace(this, ctx);
                    ns.setLocal(local)
                    ctx.addSymbol(ns);
                    local = false;
                    break;
                case "type":
                    this.reject();
                    let dt = ParseMethods.parseTypeDecl(this, this.basePackage.ctx);
                    dt.setLocal(local)
                    ctx.addSymbol(dt)
                    local = false;
                    break;
                case "extern":
                    this.reject();
                    let ffi = ParseMethods.parseFFI(this, this.basePackage.ctx);
                    ffi.setLocal(local)
                    ctx.addSymbol(ffi)
                    local = false;
                    break;
                default:
                    this.reject();
                    let e = ParseMethods.parseStatement(this, this.basePackage.ctx);
                    if (!(e instanceof FunctionDeclarationStatement) && !(e instanceof VariableDeclarationStatement)) {
                        this.customError("Invalid global statement, only function/variable declarations are allowed globally", e.location)
                    }

                    if(e instanceof FunctionDeclarationStatement){
                        e.symbolPointer.setLocal(local)
                    }
                    //console.log(JSON.stringify(e.serialize()))
                    this.basePackage.addStatement(e);
                    local = false;
            }
            token = this.peek();
        }

        // mark the end location of the context
        ctx.endLocation = this.loc();
    }

    jumpTo(location: SymbolLocation){
        this.lexer.jumpTo(location);
        this.tokenStack = [];
        this.stackIndex = 0;
        this.lastSeenToken = null;
        this.lastReadToken = null;
    }
}
