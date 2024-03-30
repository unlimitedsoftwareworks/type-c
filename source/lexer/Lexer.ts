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
import { Token } from './Token'

export class Lexer {
    filepath: string;
    data: string;
    dataIndex: number;
    dataLength: number;

    tokenStack: Token[];
    lineC: number;
    colC: number;

    static tokenRegexArray: [TokenType, RegExp][] = [
        // Keywords
        [TokenType.TOK_AWAIT, /^await\b/],
        [TokenType.TOK_TYPE_CONVERSION_SAFE, /^as\?/],
        [TokenType.TOK_TYPE_CONVERSION_FORCE, /^as!/],
        [TokenType.TOK_TYPE_CONVERSION, /^as\b/],
        [TokenType.TOK_BREAK, /^break\b/],
        [TokenType.TOK_CLASS, /^class\b/],
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
        [TokenType.TOK_IN, /^in\b/],
        [TokenType.TOK_IS, /^is\b/],
        [TokenType.TOK_INTERFACE, /^interface\b/],
        [TokenType.TOK_MUT, /^mut\b/],
        [TokenType.TOK_LOCK, /^lock\b/],
        [TokenType.TOK_PROMISE, /^promise\b/],
        [TokenType.TOK_SPAWN, /^spawn\b/],
        [TokenType.TOK_LET, /^let\b/],
        [TokenType.TOK_NEW, /^new\b/],
        [TokenType.TOK_NULL, /^null\b/],
        [TokenType.TOK_RETURN, /^return\b/],
        [TokenType.TOK_THIS, /^this\b/],
        [TokenType.TOK_STATIC, /^static\b/],
        [TokenType.TOK_STRICT, /^strict\b/],
        [TokenType.TOK_STRUCT, /^struct\b/],
        [TokenType.TOK_MATCH, /^match\b/],
        [TokenType.TOK_TRUE, /^true\b/],
        [TokenType.TOK_TYPE, /^type\b/],
        [TokenType.TOK_WHILE, /^while\b/],

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
        [TokenType.TOK_FLOAT_LITERAL, /^[0-9]+\.[0-9]+f/],
        [TokenType.TOK_DOUBLE_LITERAL, /^[0-9]+\.[0-9]+/],
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

        [TokenType.TOK_EOF, /^$/]
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
        if (this.currentChar() == '\n') {
            this.lineC++;
            this.colC = 0;
        }
        else {
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
        if (pattern.length > (this.dataLength - this.dataIndex)) {
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

        while (this.currentChar() == " " || this.currentChar() == "\t" || this.currentChar() == "\n") {
            this.inc();
        }

        // skip comments
        if (this.compare("//")) {
            while (this.canLookAhead() && (this.currentChar() != "\n")) {
                this.inc();
            }
            reskip = true;
        }
        else if (this.compare("/*")) {
            while (this.canLookAhead() && !this.compare("*/")) {
                this.inc();
            }
            reskip = true;
        }
        if(reskip){
            this.skipWhitespaces();
        }

    }

    nextToken(): Token {
        this.skipWhitespaces();

        for (const [tokenType, regex] of Lexer.tokenRegexArray) {
            const match = this.data.substring(this.dataIndex).match(regex);
            if (match && match[0]) {
                const lexeme = match[0];
                // Update dataIndex to point after this token
                this.dataIndex += lexeme.length;
                // Create new Token object and return
                let res = new Token(tokenType, lexeme, this.dataIndex - lexeme.length, this.lineC, this.colC, this.filepath);
                if((res.type == "identifier") && (res.value == "_")){
                    res = new Token(TokenType.TOK_WILDCARD, lexeme, this.dataIndex - lexeme.length, this.lineC, this.colC, this.filepath);
                }
                this.colC += lexeme.length;
                return res;
            }
        }

        if(!this.canLookAhead()){
            return new Token(TokenType.TOK_EOF, "", this.dataIndex, this.lineC, this.colC, this.filepath);
        }

        // If we get here, we didn't find any token at the current position
        throw new Error(`Unexpected token at line ${this.lineC}, column ${this.colC}`);
    }
}