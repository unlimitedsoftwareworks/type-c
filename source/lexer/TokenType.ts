/**
 * Filename: TokenType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Hosts all kind of tokens that the lexer can produce
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

export enum TokenType {
    // Keywords.
    TOK_TYPE_CONVERSION = "as",
    TOK_TYPE_CONVERSION_FORCE = "as!",
    TOK_TYPE_CONVERSION_SAFE = "as?",
    TOK_BREAK = "break",
    TOK_CLASS = "class",
    TOK_CONTINUE = "continue",
    TOK_VARIANT = "variant",
    TOK_COROUTINE = "coroutine",
    TOK_CONST = "const",
    TOK_DO = "do",
    TOK_ELSE = "else",
    TOK_ENUM = "enum",
    TOK_EXTERN = "extern",
    TOK_FALSE = "false",
    TOK_FROM = "from",
    TOK_FOR = "for",
    TOK_FOREACH = "foreach",
    TOK_FN = "fn",
    TOK_CFN = "cfn",
    TOK_IF = "if",
    TOK_IMPORT = "import",
    TOK_IMPL = "impl",
    TOK_IN = "in",
    TOK_IS = "is",
    TOK_INTERFACE = "interface",
    TOK_MUTATE = "mutate",
    TOK_MUT = "mut",
    TOK_YIELD_FINAL = "yield!",
    TOK_YIELD = "yield",
    TOK_UNREACHABLE = "unreachable",
    TOK_OVERRIDE = "override",
    TOK_I8 = "i8",
    TOK_I16 = "i16",
    TOK_I32 = "i32",
    TOK_I64 = "i64",
    TOK_U8 = "u8",
    TOK_U16 = "u16",
    TOK_U32 = "u32",
    TOK_U64 = "u64",
    TOK_F32 = "f32",
    TOK_F64 = "f64",
    TOK_BOOLEAN = "bool",
    TOK_VOID = "void",
    TOK_STRING = "string",
    TOK_CHAR = "char",
    TOK_NULLABLE = "?",
    TOK_THROW = "throw",
    TOK_LET = "let",
    TOK_NEW = "new",
    TOK_NULL = "null",
    TOK_RETURN = "return",
    TOK_THIS = "this",
    TOK_STATIC = "static",
    TOK_STRICT = "strict",
    TOK_STRUCT = "struct",
    TOK_LOCAL = "local",
    TOK_NAMESPACE = "namespace",
    TOK_MATCH = "match",
    TOK_TRUE = "true",
    TOK_TYPE = "type",
    TOK_WHILE = "while",
    TOK_PARTIAL = "partial",
    TOK_SEMICOLON = ";",
    TOK_COLON = ":",
    TOK_COMMA = ",",
    TOK_DOT = ".",
    TOK_NULLDOT = "?.",
    TOK_DOTDOTDOT = "...",
    TOK_LPAREN = "(",
    TOK_RPAREN = ")",
    TOK_LBRACKET = "[",
    TOK_RBRACKET = "]",
    TOK_LBRACE = "{",
    TOK_RBRACE = "}",
    TOK_NOT = "!",
    TOK_EQUAL = "=",
    TOK_LOGICAL_OR = "||",
    TOK_COALESCING = "??",
    TOK_LOGICAL_AND = "&&",
    TOK_NOT_EQUAL = "!=",
    TOK_PIPE = "|>",
    TOK_CASE_EXPR = "=>",
    TOK_DENULL = "!!",
    TOK_LESS = "<",
    TOK_LESS_EQUAL = "<=",
    TOK_GREATER = ">",
    TOK_GREATER_EQUAL = ">=",
    TOK_PLUS = "+",
    TOK_PLUS_EQUAL = "+=",
    TOK_MINUS = "-",
    TOK_MINUS_EQUAL = "-=",
    TOK_STAR = "*",
    TOK_STAR_EQUAL = "*=",
    TOK_DIV = "/",
    TOK_DIV_EQUAL = "/=",

    TOK_PERCENT = "%",
    TOK_PERCENT_EQUAL = "%=",
    TOK_BITWISE_NOT = "~",
    TOK_BITWISE_OR = "|",
    TOK_BITWISE_XOR = "^",
    TOK_BITWISE_AND = "&",
    TOK_LEFT_SHIFT = "<<",
    TOK_RIGHT_SHIFT = ">>",
    TOK_EQUAL_EQUAL = "==",
    TOK_INCREMENT = "++",
    TOK_DECREMENT = "--",
    TOK_FN_RETURN_TYPE = "->",

    // Literals.
    TOK_WILDCARD = "_",
    TOK_IDENTIFIER = "identifier",
    TOK_STRING_LITERAL = "string_literal",
    TOK_BINARY_STRING_LITERAL = "binary_string_literal",
    TOK_CHAR_LITERAL = "char_literal",
    TOK_INT_LITERAL = "int_literal",
    TOK_BINARY_INT_LITERAL = "binary_int_literal",
    TOK_OCT_INT_LITERAL = "oct_int_literal",
    TOK_HEX_INT_LITERAL = "hex_int_literal",
    TOK_FLOAT_LITERAL = "float_literal",
    TOK_DOUBLE_LITERAL = "double_literal",
    TOK_EOF = "EOF",
}
