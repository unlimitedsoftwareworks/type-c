/**
 * Filename: LiteralExpression.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a literal expression
 *      "hello", 3.14f
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { BuiltinModules } from "../../BuiltinModules";
import { matchDataTypes } from "../../typechecking/TypeChecking";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { ArrayType } from "../types/ArrayType";
import { BasicType, BasicTypeKind } from "../types/BasicType";
import { BooleanType } from "../types/BooleanType";
import { DataType } from "../types/DataType";
import { NullType } from "../types/NullType";
import { NullableType } from "../types/NullableType";
import { Expression } from "./Expression";

export type LiteralKind = 
    "string_literal" |  // "hello"
    "binary_string_literal" |  // b"hello"
    "char_literal" |  // 'h'
    "int_literal" |  // 1
    "binary_int_literal" | // 0b101
    "oct_int_literal" | // 0o101
    "hex_int_literal" |  // 0x101
    "float_literal" |  // 1.0f
    "double_literal" |  // 1.0
    "true" |  // true
    "false" |  // false
    "null" // null
;

function unescapeCString(input: string): string {
    // Remove surrounding double quotes if they exist
    if (input.startsWith('"') && input.endsWith('"')) {
        input = input.substring(1, input.length - 1);
    }

    // Replace C-style escape sequences
    return input
        .replace(/\\n/g, '\n')    // Newline
        .replace(/\\t/g, '\t')    // Tab
        .replace(/\\r/g, '\r')    // Carriage return
        .replace(/\\b/g, '\b')    // Backspace
        .replace(/\\f/g, '\f')    // Form feed
        .replace(/\\v/g, '\v')    // Vertical tab
        .replace(/\\0/g, '\0')    // Null byte
        .replace(/\\'/g, '\'')    // Single quote
        .replace(/\\"/g, '"')     // Double quote
        .replace(/\\\\/g, '\\');  // Backslash
}

function parseTCInt(number: string): number | bigint {
    let value: number | bigint;
    if (number.startsWith("0b")) {
        value = parseInt(number, 2);
    } else if (number.startsWith("0o")) {
        value = parseInt(number, 8);
    } else if (number.startsWith("0x")) {
        value = parseInt(number, 16);
    } else {
        value = number.includes(".") ? parseFloat(number) : parseInt(number, 10);
    }

    return value;
}

function checkLiteralIntStorage(number: string, hint: BasicTypeKind): boolean {
    // Convert the number from its string representation to an actual number
    let value: number | bigint = parseTCInt(number);

    // Check if the number fits in the given hint type
    switch (hint) {
        case "u8":
            return 0 <= value && value <= 0xFF;
        case "i8":
            return -0x80 <= value && value <= 0x7F;
        case "u16":
            return 0 <= value && value <= 0xFFFF;
        case "i16":
            return -0x8000 <= value && value <= 0x7FFF;
        case "u32":
            return 0 <= value && value <= 0xFFFFFFFF;
        case "i32":
            return -0x80000000 <= value && value <= 0x7FFFFFFF;
        case "u64":
            // JavaScript does not support 64-bit integers natively, so we need to handle this differently
            // Assuming BigInt could be used here for a more accurate check
            return BigInt(value) >= BigInt(0) && BigInt(value) <= BigInt("0xFFFFFFFFFFFFFFFF");
        case "i64":
            // Similarly, using BigInt for 64-bit signed integer range
            return BigInt(value) >= BigInt("-0x8000000000000000") && BigInt(value) <= BigInt("0x7FFFFFFFFFFFFFFF");
        case "f32":
            // Check against the maximum and minimum values that a 32-bit float can represent
            return Number.isFinite(value) && Math.fround(value as number) === value;
        case "f64":
            // For 64-bit float, we just check if it's a finite number since JS uses 64-bit floats by default
            return Number.isFinite(value);
        default:
            return false;
    }
}

function findLeastSufficientType(value: string): BasicTypeKind {
    // Determine if the value is floating-point or integer
    const isFloat = value.includes('.') || value.toLowerCase().includes('e');
    const num = isFloat ? parseFloat(value) : BigInt(value);

    // Handle floating-point numbers
    if (isFloat) {
        if (num >= -3.4e38 && num <= 3.4e38) return "f32";
        else return "f64"; // Assumes f64 can cover the rest of the cases
    }

    // Handle signed integers
    if (value.startsWith('-')) {
        if (num >= BigInt(-128) && num <= BigInt(127)) return "i8";
        else if (num >= BigInt(-32768) && num <= BigInt(32767)) return "i16";
        else if (num >= BigInt(-2147483648) && num <= BigInt(2147483647)) return "i32";
        else return "i64"; // Assumes i64 can cover the rest of the cases
    }
    // Handle unsigned integers
    else {
        if (num >= BigInt(0) && num <= BigInt(255)) return "u8";
        else if (num >= BigInt(0) && num <= BigInt(65535)) return "u16";
        else if (num >= BigInt(0) && num <= BigInt(4294967295)) return "u32";
        else return "u64"; // Assumes u64 can cover the rest of the cases
    }
}


export class LiteralExpression extends Expression {
    literalKind: LiteralKind;

    constructor(location: SymbolLocation, literalKind: LiteralKind){
        super(location, literalKind);
        this.literalKind = literalKind;
    }

    setInferredToHint() {
        if(this.hintType) {
            // for literal expressions, the inferred type is the hint type when available,
            // so that literals are stored as the expected type in the bytecode
            this.inferredType = this.hintType;
        }
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): LiteralExpression {
        return this;   
    }
}

export class StringLiteralExpression extends LiteralExpression {
    value: string;

    constructor(location: SymbolLocation, value: string){
        super(location, "string_literal");
        this.value = unescapeCString(value);
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);
    
        if(BuiltinModules.String == undefined){
            throw ctx.parser.customError("Default String class is not defined.", this.location);
        }

        this.inferredType = BuiltinModules.String;
        this.checkHint(ctx);

        return this.inferredType;
    }
}

export class BinaryStringLiteralExpression extends LiteralExpression {
    value: string;

    constructor(location: SymbolLocation, value: string){
        super(location, "binary_string_literal");
        // remove the surrounding quotes
        this.value = unescapeCString(value)
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);


        this.inferredType = new ArrayType(this.location, new BasicType(this.location, 'u8'));

        if(hint) {
            let res = matchDataTypes(ctx, hint, this.inferredType);
            if (!res.success) {
                ctx.parser.customError(`Incompatible types: ${res.message}`, this.location);
            }
        }

        return this.inferredType;
    }
}

export class CharLiteralExpression extends LiteralExpression {
    value: string;

    constructor(location: SymbolLocation, value: string){
        super(location, "char_literal");
        this.value = value;
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);
        throw ctx.parser.customError("Not implemented", this.location);
    }
}

export class IntLiteralExpression extends LiteralExpression {
    value: string;

    constructor(location: SymbolLocation, value: string){
        super(location, "int_literal");
        this.value = value;
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        if(hint && (hint.dereference() instanceof BasicType)) {
            if(!checkLiteralIntStorage(this.value, (hint.dereference() as BasicType).kind as BasicTypeKind)){
                ctx.parser.customError("Literal value does not fit in the given type", this.location);
            }

            this.inferredType = hint;
        }

        else if (!hint) {
            this.inferredType = new BasicType(this.location, findLeastSufficientType(this.value));
        }
        else {
            this.inferredType = new BasicType(this.location, findLeastSufficientType(this.value));
            throw ctx.parser.customError(`Unexpected type, ${hint.shortname()} expected but found ${this.inferredType?.shortname()}`, this.location);
        }
        this.setInferredToHint();
        return this.inferredType;
    }


    static makeLiteral(location: SymbolLocation, value: number, 
        kind: "u8"| "u16"| "u32"| "u64"| "i8"| "i16"| "i32"| "i64"| "f32"| "f64"): IntLiteralExpression {
        let literal = new IntLiteralExpression(location, value.toString());
        literal.inferredType = new BasicType(location, kind);
        return literal;
    }
    
}

export class BinaryIntLiteralExpression extends LiteralExpression {
    value: string;

    constructor(location: SymbolLocation, value: string){
        super(location, "binary_int_literal");
        this.value = value;
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        if(hint && (hint.dereference() instanceof BasicType)) {
            if(!checkLiteralIntStorage(this.value, (hint.dereference() as BasicType).kind as BasicTypeKind)){
                ctx.parser.customError("Literal value does not fit in the given type", this.location);
            }

            this.inferredType = hint;
        }

        else {
            throw new Error("Hint for integer literal must be a basic type or a boolean type");
        }

        this.setInferredToHint();
        return this.inferredType;
    }
}

export class OctIntLiteralExpression extends LiteralExpression {
    value: string;

    constructor(location: SymbolLocation, value: string){
        super(location, "oct_int_literal");
        this.value = value;
    }


    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        if(hint && (hint.dereference() instanceof BasicType)) {
            if(!checkLiteralIntStorage(this.value, (hint.dereference() as BasicType).kind as BasicTypeKind)){
                ctx.parser.customError("Literal value does not fit in the given type", this.location);
            }

            this.inferredType = hint;
        }

        else {
            throw new Error("Hint for integer literal must be a basic type or a boolean type");
        }

        this.setInferredToHint();
        return this.inferredType;
    }
}

export class HexIntLiteralExpression extends LiteralExpression {
    value: string;

    constructor(location: SymbolLocation, value: string){
        super(location, "hex_int_literal");
        this.value = value;
    }


    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        if(hint && (hint.dereference() instanceof BasicType)) {
            if(!checkLiteralIntStorage(this.value, (hint.dereference() as BasicType).kind as BasicTypeKind)){
                ctx.parser.customError("Literal value does not fit in the given type", this.location);
            }

            this.inferredType = hint;
        }

        else {
            throw new Error("Hint for integer literal must be a basic type or a boolean type");
        }

        this.setInferredToHint();
        return this.inferredType;
    }
}

export class FloatLiteralExpression extends LiteralExpression {
    value: string;

    constructor(location: SymbolLocation, value: string){
        super(location, "float_literal");
        this.value = value;
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        this.inferredType = new BasicType(this.location, "f32");

        this.checkHint(ctx);
        if(hint) {
            // for literal expressions, the inferred type is the hint type when available,
            // so that literals are stored as the expected type in the bytecode
            this.inferredType = hint;
        }
        this.setInferredToHint();
        return this.inferredType;
    }
}

export class DoubleLiteralExpression extends LiteralExpression {
    value: string;

    constructor(location: SymbolLocation, value: string){
        super(location, "double_literal");
        this.value = value;
    }


    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        this.inferredType = new BasicType(this.location, "f64");

        this.checkHint(ctx);
        return this.inferredType;
    }
}

export class TrueLiteralExpression extends LiteralExpression {
    constructor(location: SymbolLocation){
        super(location, "true");
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        this.inferredType = new BooleanType(this.location);

        this.checkHint(ctx);
        return this.inferredType;
    }

    static makeLiteral(location: SymbolLocation): TrueLiteralExpression {
        let literal = new TrueLiteralExpression(location);
        literal.inferredType = new BooleanType(location);
        return literal;
    }
}

export class FalseLiteralExpression extends LiteralExpression {
    constructor(location: SymbolLocation){
        super(location, "false");
    }


    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        this.inferredType = new BooleanType(this.location);

        
        this.checkHint(ctx);
        return this.inferredType;
    }
}

export class NullLiteralExpression extends LiteralExpression {
    constructor(location: SymbolLocation){
        super(location, "null");
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        // make sure that the hint is either a nullable or null.
        if(hint !== null){
            if(!((hint.is(ctx, NullType)) || (hint.is(ctx, NullableType)))) {
                ctx.parser.customError("Expected a nullable or null type", this.location);
            }
        }

        this.inferredType = new NullType(this.location);

        return this.inferredType;
    }
}