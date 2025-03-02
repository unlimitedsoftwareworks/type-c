/**
 * Filename: Lexer.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Lexer data structure
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { TokenType } from "./TokenType";
import { Token } from "./Token";
import { SymbolLocation } from "../ast/symbol/SymbolLocation";
import { ParseState } from "../parser/parsefuncs";
import { Documentation } from "./Documentation";

export class Lexer {
    filepath: string;
    data: string;
    dataIndex: number;
    dataLength: number;

    tokenStack: Token[];
    lineC: number;
    colC: number;

    private limit: { line: number; col: number } | null = null;
    stateCapturePosition : {
        file: string;
        line: number;
        col: number;
        callback: (stack: ParseState[]) => void;
    } | null = null;

    private currentDocumentation: Documentation | null = null;

    private lastSeenTag: "brief" | "prop" | null = null;
    private lastPropName: string | null = null;

    static tokenRegexArray: [TokenType, RegExp][] = [
        // Keywords
        [TokenType.TOK_TYPE_CONVERSION_SAFE, /^as\?/],
        [TokenType.TOK_TYPE_CONVERSION_FORCE, /^as!/],
        [TokenType.TOK_TYPE_CONVERSION, /^as\b/],
        [TokenType.TOK_BREAK, /^break\b/],
        [TokenType.TOK_CLASS, /^class\b/],
        [TokenType.TOK_CFN, /^cfn\b/],
        [TokenType.TOK_COROUTINE, /^coroutine\b/],
        [TokenType.TOK_CONTINUE, /^continue\b/],
        [TokenType.TOK_VARIANT, /^variant\b/],
        [TokenType.TOK_CONST, /^const\b/],
        [TokenType.TOK_DO, /^do\b/],
        [TokenType.TOK_ELSE, /^else\b/],
        [TokenType.TOK_ENUM, /^enum\b/],
        [TokenType.TOK_EXTERN, /^extern\b/],
        [TokenType.TOK_FALSE, /^false\b/],
        [TokenType.TOK_FROM, /^from\b/],
        [TokenType.TOK_FOR, /^for\b/],
        [TokenType.TOK_FOREACH, /^foreach\b/],
        [TokenType.TOK_FN, /^fn\b/],
        [TokenType.TOK_IF, /^if\b/],
        [TokenType.TOK_IMPORT, /^import\b/],
        [TokenType.TOK_IMPL, /^impl\b/],
        [TokenType.TOK_IN, /^in\b/],
        [TokenType.TOK_IS, /^is\b/],
        [TokenType.TOK_INTERFACE, /^interface\b/],
        [TokenType.TOK_MUTATE, /^mutate\b/],
        [TokenType.TOK_MUT, /^mut\b/],
        [TokenType.TOK_LET, /^let\b/],
        [TokenType.TOK_NEW, /^new\b/],
        [TokenType.TOK_NULL, /^null\b/],
        [TokenType.TOK_RETURN, /^return\b/],
        [TokenType.TOK_THIS, /^this\b/],
        [TokenType.TOK_STATIC, /^static\b/],
        [TokenType.TOK_STRICT, /^strict\b/],
        [TokenType.TOK_STRUCT, /^struct\b/],
        [TokenType.TOK_LOCAL, /^local\b/],
        [TokenType.TOK_NAMESPACE, /^namespace\b/],
        [TokenType.TOK_MATCH, /^match\b/],
        [TokenType.TOK_TRUE, /^true\b/],
        [TokenType.TOK_TYPE, /^type\b/],
        [TokenType.TOK_WHILE, /^while\b/],
        [TokenType.TOK_YIELD_FINAL, /^yield!/],
        [TokenType.TOK_YIELD, /^yield\b/],
        [TokenType.TOK_UNREACHABLE, /^unreachable\b/],
        [TokenType.TOK_OVERRIDE, /^override\b/],
        [TokenType.TOK_THROW, /^throw\b/],

        // Special types
        [TokenType.TOK_I8, /^i8\b/],
        [TokenType.TOK_I16, /^i16\b/],
        [TokenType.TOK_I32, /^i32\b/],
        [TokenType.TOK_I64, /^i64\b/],
        [TokenType.TOK_U8, /^u8\b/],
        [TokenType.TOK_U16, /^u16\b/],
        [TokenType.TOK_U32, /^u32\b/],
        [TokenType.TOK_U64, /^u64\b/],
        [TokenType.TOK_F32, /^f32\b/],
        [TokenType.TOK_F64, /^f64\b/],
        [TokenType.TOK_BOOLEAN, /^bool\b/],
        [TokenType.TOK_VOID, /^void\b/],
        [TokenType.TOK_STRING, /^string\b/],
        [TokenType.TOK_CHAR, /^char\b/],
        [TokenType.TOK_PARTIAL, /^partial\b/],

        [TokenType.TOK_COALESCING, /^\?\?/], // must be before TOK_NULLABLE
        [TokenType.TOK_NULLDOT, /^\?\./],
        [TokenType.TOK_NULLABLE, /^\?/],

        // Literals and EOF
        [TokenType.TOK_WILDCARD, /^_$/], // WILL not match, it's fixed below
        [TokenType.TOK_STRING_LITERAL, /^"[^"]*"/],
        [TokenType.TOK_BINARY_STRING_LITERAL, /^b"[^"]*"/],
        [TokenType.TOK_CHAR_LITERAL, /^'[^']'/],
        [TokenType.TOK_BINARY_INT_LITERAL, /^0b[01]+/],
        [TokenType.TOK_OCT_INT_LITERAL, /^0o[0-7]+/],
        [TokenType.TOK_HEX_INT_LITERAL, /^0x[0-9A-Fa-f]+/],
        [TokenType.TOK_FLOAT_LITERAL,  /^[0-9]*\.[0-9]+([eE][+-]?[0-9]+)?f/],
        [TokenType.TOK_DOUBLE_LITERAL, /^[0-9]*\.[0-9]+([eE][+-]?[0-9]+)?/],
        
        [TokenType.TOK_INT_LITERAL, /^[0-9]+/],
        [TokenType.TOK_IDENTIFIER, /^(?!_$)[a-zA-Z_][a-zA-Z0-9_]*/],

        // Operators and Punctuation (longer versions first)
        [TokenType.TOK_DOTDOTDOT, /^\.\.\./],
        [TokenType.TOK_LESS_EQUAL, /^<=/],
        [TokenType.TOK_GREATER_EQUAL, /^>=/],
        [TokenType.TOK_PLUS_EQUAL, /^\+=/],
        [TokenType.TOK_MINUS_EQUAL, /^-=/],
        [TokenType.TOK_STAR_EQUAL, /^\*=/],
        [TokenType.TOK_DIV_EQUAL, /^\/=/],
        [TokenType.TOK_LEFT_SHIFT, /^<</],
        [TokenType.TOK_RIGHT_SHIFT, /^>>/],
        [TokenType.TOK_EQUAL_EQUAL, /^==/],
        [TokenType.TOK_NOT_EQUAL, /^!=/],
        [TokenType.TOK_PIPE, /^\|\>/],
        [TokenType.TOK_LOGICAL_OR, /^\|\|/],
        [TokenType.TOK_LOGICAL_AND, /^&&/],
        [TokenType.TOK_BITWISE_OR, /^\|/],
        [TokenType.TOK_BITWISE_XOR, /^\^/],
        [TokenType.TOK_BITWISE_AND, /^&/],
        [TokenType.TOK_CASE_EXPR, /^=>/],
        [TokenType.TOK_DENULL, /^!!/],
        [TokenType.TOK_INCREMENT, /^\+\+/],
        [TokenType.TOK_DECREMENT, /^--/],
        [TokenType.TOK_FN_RETURN_TYPE, /^->/],
        [TokenType.TOK_SEMICOLON, /^;/],
        [TokenType.TOK_COLON, /^:/],
        [TokenType.TOK_COMMA, /^,/],
        [TokenType.TOK_DOT, /^\./],
        [TokenType.TOK_LPAREN, /^\(/],
        [TokenType.TOK_RPAREN, /^\)/],
        [TokenType.TOK_LBRACKET, /^\[/],
        [TokenType.TOK_RBRACKET, /^\]/],
        [TokenType.TOK_LBRACE, /^{/],
        [TokenType.TOK_RBRACE, /^}/],
        [TokenType.TOK_NOT, /^!/],
        [TokenType.TOK_EQUAL, /^=/],
        [TokenType.TOK_LESS, /^</],
        [TokenType.TOK_GREATER, /^>/],
        [TokenType.TOK_PLUS, /^\+/],
        [TokenType.TOK_MINUS, /^-/],
        [TokenType.TOK_STAR, /^\*/],
        [TokenType.TOK_DIV, /^\//],
        [TokenType.TOK_PERCENT_EQUAL, /^%=/],
        [TokenType.TOK_PERCENT, /^%/],
        [TokenType.TOK_BITWISE_NOT, /^~/],

        [TokenType.TOK_EOF, /^$/],
    ];

    constructor(filePath: string, data: string) {
        this.filepath = filePath;
        this.data = data;
        this.dataLength = data.length;
        this.tokenStack = [];
        this.lineC = 0;
        this.colC = 0;
        this.dataIndex = 0;
    }

    currentChar(): string {
        return this.data[this.dataIndex];
    }

    canLookAhead(): boolean {
        return this.dataIndex < this.dataLength;
    }

    inc() {
        // check if we have new line
        if (this.currentChar() == "\n") {
            this.lineC++;
            this.colC = 0;
        } else {
            this.colC++;
        }
        this.dataIndex++;
    }

    /**
     * Compares the data from the current position with the given
     * pattern string. If it matches, it returns true and advances
     * the data index. Otherwise, it returns false.
     * @param pattern
     */
    compare(pattern: string): boolean {
        if (pattern.length > this.dataLength - this.dataIndex) {
            return false;
        }

        for (let i = 0; i < pattern.length; i++) {
            if (this.data[this.dataIndex + i] != pattern[i]) {
                return false;
            }
        }
        // we accept
        this.dataIndex += pattern.length;

        return true;
    }

    skipWhitespaces() {
        let reskip = false;

        while (
            this.currentChar() == " " ||
            this.currentChar() == "\t" ||
            this.currentChar() == "\n"
        ) {
            this.inc();
        }

        // skip comments
        if (this.compare("//")) {
            while (this.canLookAhead() && this.currentChar() != "\n") {
                this.inc();
            }
            reskip = true;
        } else if (this.compare("/*")) {
            // Check if this is a documentation comment
            if (this.currentChar() === "*") {
                const startLocation = new SymbolLocation(
                    this.filepath,
                    this.lineC,
                    this.colC - 2, // Account for /* characters
                    this.dataIndex - 2
                );
                this.currentDocumentation = this.parseDocumentation(startLocation);
            } else {
                // Regular multi-line comment
                while (this.canLookAhead() && !this.compare("*/")) {
                    this.inc();
                }
            }
            reskip = true;
        }

        if (reskip) {
            this.skipWhitespaces();
        }
    }

    /**
     * Sets a virtual EOF position for intellisense mode
     * @param line Line number to stop at
     * @param col Column number to stop at
     */
    setLimit(line: number, col: number) {
        this.limit = { line, col };
    }

    /**
     * Sets a marker at which to capture the state of the parser
     */
    setStateCapturePosition(file: string, line: number, col: number, callback: (stack: ParseState[]) => void) {
        if(file != this.filepath){
            return;
        }

        this.stateCapturePosition = { file, line, col, callback };
    }

    /**
     * Removes the virtual EOF limit
     */
    clearLimit() {
        this.limit = null;
    }

    /**
     * Check if we've hit the virtual limit
     */
    private isAtLimit(): boolean {
        return this.limit !== null && 
               (this.lineC > this.limit.line || 
                (this.lineC === this.limit.line && this.colC >= this.limit.col));
    }

    isAtStateCapturePosition(line: number, col: number): boolean {
        return (this.stateCapturePosition !== null) && 
               (this.lineC > this.stateCapturePosition.line || 
                (this.lineC === this.stateCapturePosition.line && this.colC > this.stateCapturePosition.col));
    }

    hasCaptureStateEvent(): boolean {
        return this.stateCapturePosition !== null;
    }

    nextToken(): Token {
        // Add limit check at start of nextToken
        if (this.isAtLimit()) {
            return new Token(
                TokenType.TOK_EOF,
                "",
                this.dataIndex,
                this.lineC,
                this.colC,
                this.filepath,
            );
        }

        this.skipWhitespaces();

        // check for EOF
        if(!this.canLookAhead()){
            return new Token(
                TokenType.TOK_EOF,
                "",
                this.dataIndex,
                this.lineC,
                this.colC,
                this.filepath,
            );
        }

        for (const [tokenType, regex] of Lexer.tokenRegexArray) {
            const match = this.data.substring(this.dataIndex).match(regex);
            if (match && match[0]) {
                const lexeme = match[0];
                // Update dataIndex to point after this token
                this.dataIndex += lexeme.length;
                // Create new Token object and return
                let res = new Token(
                    tokenType,
                    lexeme,
                    this.dataIndex - lexeme.length,
                    this.lineC,
                    this.colC,
                    this.filepath,
                ).setDocumentation(this.currentDocumentation);
                

                if (res.type == "identifier" && res.value == "_") {
                    res = new Token(
                        TokenType.TOK_WILDCARD,
                        lexeme,
                        this.dataIndex - lexeme.length,
                        this.lineC,
                        this.colC,
                        this.filepath,
                    ).setDocumentation(this.currentDocumentation);
                }
                this.colC += lexeme.length;

                if(res.documentation){
                    this.currentDocumentation = null;
                }

                return res;
            }
        }

        if (!this.canLookAhead()) {
            return new Token(
                TokenType.TOK_EOF,
                "",
                this.dataIndex,
                this.lineC,
                this.colC,
                this.filepath,
            );
        }

        // If we get here, we didn't find any token at the current position
        throw new Error(
            `Unexpected token at line ${this.lineC}, column ${this.colC}`,
        );
    }

    skipToNextLine() {
        while (this.canLookAhead() && this.currentChar() != "\n") {
            this.inc();
        }
        this.inc();
    }

    jumpTo(location: SymbolLocation) {
        // Reset counters
        this.lineC = 0;
        this.colC = 0;
        this.dataIndex = 0;

        // Scan to target line
        while (this.lineC < location.line && this.canLookAhead()) {
            if (this.currentChar() === "\n") {
                this.lineC++;
                this.colC = 0;
            } else {
                this.colC++;
            }
            this.dataIndex++;
        }

        // Move to target column
        while (this.colC < location.col && this.canLookAhead()) {
            this.colC++;
            this.dataIndex++;
        }

        // Clear token stack since we've moved
        this.tokenStack = [];
    }

    private parseDocumentation(startLocation: SymbolLocation) {
        // Create new documentation object
        const doc = new Documentation(startLocation);
        
        // Skip the initial /**
        this.inc();
        this.inc();
        this.inc();

        let currentLine = "";
        
        while (this.canLookAhead()) {
            if (this.currentChar() === "*" && this.data[this.dataIndex + 1] === "/") {
                // Process the last line before ending
                this.processDocLine(currentLine.trim(), doc);
                this.inc(); // Skip *
                this.inc(); // Skip /
                break;
            }

            if (this.currentChar() === "\n") {
                this.processDocLine(currentLine.trim(), doc);
                currentLine = "";
                this.inc();
                continue;
            }

            currentLine += this.currentChar();
            this.inc();
        }

        return doc;
    }

    private processDocLine(line: string, doc: Documentation) {
        // Remove leading * and whitespace if present
        line = line.replace(/^\s*\*\s*/, "");
        
        if (!line) return;

        // Handle @brief
        if (line.startsWith("@brief")) {
            doc.brief = line.substring(6).trim();
            this.lastSeenTag = "brief";
            return;
        }

        // Handle @extraComments
        if (line.startsWith("@extraComments")) {
            doc.extraComments = line.substring(13).trim();
            this.lastSeenTag = null;
            return;
        }

        // Handle @param or @prop
        if (line.startsWith("@param") || line.startsWith("@prop")) {
            // Fix: Improve regex to handle multi-line descriptions
            const matches = line.match(/@(?:param|prop)\s+(\w+)(?:\s*:\s*(.+))?/);
            if (matches) {
                const [, prop, value] = matches;
                doc.props[prop] = value ? value.trim() : "";  // Initialize empty string if no description
                this.lastSeenTag = "prop";
                this.lastPropName = prop;
            }
            return;
        }

        // Handle other @tags
        if (line.startsWith("@")) {
            // Fix: Don't treat everything as a prop
            const matches = line.match(/@(\w+)(?:\s*:\s*(.+))?/);
            if (matches) {
                const [, tag, value] = matches;
                // Don't prefix with "undefined"
                doc.props[tag] = value ? value.trim() : "";
                this.lastSeenTag = "prop";
                this.lastPropName = tag;
            }
            return;
        }

        // If no @ tag, append to the last seen property
        if (this.lastSeenTag === "brief" && doc.brief) {
            doc.brief += " " + line;
        } else if (this.lastSeenTag === "prop" && this.lastPropName) {
            // Ensure the property exists before appending
            if (!doc.props[this.lastPropName]) {
                doc.props[this.lastPropName] = "";
            }
            doc.props[this.lastPropName] += " " + line;
        }
    }
}
