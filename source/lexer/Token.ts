/**
 * Filename: Token.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a Lexer token
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { TokenType } from "./TokenType";
import {SymbolLocation} from "../ast/symbol/SymbolLocation";
import { BinaryIntLiteralExpression, BinaryStringLiteralExpression, CharLiteralExpression, DoubleLiteralExpression, FalseLiteralExpression, FloatLiteralExpression, HexIntLiteralExpression, IntLiteralExpression, LiteralExpression, NullLiteralExpression, OctIntLiteralExpression, StringLiteralExpression, TrueLiteralExpression } from "../ast/expressions/LiteralExpression";
import { Documentation } from "./Documentation";

export class Token {
    value: string;
    type: TokenType;
    location: SymbolLocation;
    documentation: Documentation | null = null;
    

    constructor(type: TokenType, value: string, pos: number, line: number, column: number, file?: string) {
        this.type = type;
        this.value = value;

        this.location = new SymbolLocation(file || "<unknown>", line, column, pos);
    }

    setDocumentation(doc: Documentation | null): Token {
        this.documentation = doc;
        return this;
    }

    toString(): string {
        return this.value;
    }


    isLiteral(): boolean {
        return ["string_literal", "binary_string_literal", "char_literal", "int_literal", "binary_int_literal", "oct_int_literal",
                "hex_int_literal", "float_literal", "double_literal", "true", "false", "null"] .includes(this.type);
    }

    toLiteral(): LiteralExpression {
        if(!this.isLiteral()) {
            throw new Error("Token is not a literal");
        }

        let loc = this.location;
        // convert to literal
        switch(this.type) {
            case "string_literal":
                return new StringLiteralExpression(loc, this.value);
            case "binary_string_literal":
                // remove the first b
                return new BinaryStringLiteralExpression(loc, this.value.slice(1));
            case "char_literal":
                return new CharLiteralExpression(loc, this.value);
            case "int_literal":
                return new IntLiteralExpression(loc, this.value);
            case "binary_int_literal":
                return new BinaryIntLiteralExpression(loc, this.value);
            case "oct_int_literal":
                return new OctIntLiteralExpression(loc, this.value);
            case "hex_int_literal":
                return new HexIntLiteralExpression(loc, this.value);
            case "float_literal":
                return new FloatLiteralExpression(loc, this.value);
            case "double_literal":
                return new DoubleLiteralExpression(loc, this.value);
            case "true":
                return new TrueLiteralExpression(loc);
            case "false":
                return new FalseLiteralExpression(loc);
            case "null":
                return new NullLiteralExpression(loc);
        }

        throw new Error("Token is not a literal");
    }

}
