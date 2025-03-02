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
import { StringEnumType } from "../types/StringEnumType";
import { Expression, InferenceMeta } from "./Expression";

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

export function unescapeCString(input: string): string {
    // Remove surrounding double quotes if they exist
    if (input.startsWith('"') && input.endsWith('"')) {
        input = input.substring(1, input.length - 1);
    }

    // Regex pattern for terminal escape sequences (e.g., \x1b[31m)
    const terminalEscapeSequence = /\\x1b\[\d{1,3}m/g;

    // Replace C-style escape sequences while preserving terminal escape sequences
    return input
        .replace(terminalEscapeSequence, (match) => {
            // Replace the backslashes to create a valid terminal escape sequence
            return match.replace(/\\x1b/, '\x1b');
        })
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
function checkLiteralIntStorage(
    number: string,
    hint: BasicTypeKind,
    isNegative: boolean
): boolean {
    // Parse the input number as a BigInt for accurate representation
    let value = BigInt(number);
    if (isNegative) {
        value = -value;
    }

    // Check if the number fits in the given hint type
    switch (hint) {
        case "u8":
            return 0n <= value && value <= 0xFFn;
        case "i8":
            return -0x80n <= value && value <= 0x7Fn;
        case "u16":
            return 0n <= value && value <= 0xFFFFn;
        case "i16":
            return -0x8000n <= value && value <= 0x7FFFn;
        case "u32":
            return 0n <= value && value <= 0xFFFFFFFFn;
        case "i32":
            return -0x80000000n <= value && value <= 0x7FFFFFFFn;
        case "u64":
            return 0n <= value && value <= 0xFFFFFFFFFFFFFFFFn;
        case "i64":
            return -0x8000000000000000n <= value && value <= 0x7FFFFFFFFFFFFFFFn;
        case "f32":
            const f32Value = Number(value);
            return Number.isFinite(f32Value) && Math.fround(f32Value) === f32Value;
        case "f64":
            const f64Value = Number(value);
            return Number.isFinite(f64Value);
        default:
            return false;
    }
}


function findLeastSufficientType(value: string): BasicTypeKind {
    // Helper to determine if a string represents a hexadecimal number
    const isHex = value.startsWith('0x') || value.startsWith('0X');

    // Determine if the value is floating-point
    const isFloat = !isHex && (value.includes('.') || value.toLowerCase().includes('e'));

    // Parse the number appropriately
    let num;
    if (isFloat) {
        num = parseFloat(value);
    } else if (isHex) {
        num = BigInt(value);
    } else {
        num = value.startsWith('-') ? BigInt(value) : BigInt(value);
    }

    // Handle floating-point numbers
    if (isFloat) {
        if (num >= -3.4e38 && num <= 3.4e38) return "f32";
        else return "f64"; // Assumes f64 can cover the rest of the cases
    }

    // Handle signed integers
    if (!isHex && value.startsWith('-')) {
        if (num >= BigInt(-128) && num <= BigInt(127)) return "i8";
        else if (num >= BigInt(-32768) && num <= BigInt(32767)) return "i16";
        else if (num >= BigInt(-2147483648) && num <= BigInt(2147483647)) return "i32";
        else return "i64"; // Assumes i64 can cover the rest of the cases
    }

    // Handle unsigned integers
    if (num >= BigInt(0) && num <= BigInt(255)) return "u8";
    else if (num >= BigInt(0) && num <= BigInt(65535)) return "u16";
    else if (num >= BigInt(0) && num <= BigInt(4294967295)) return "u32";
    else return "u64"; // Assumes u64 can cover the rest of the cases
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
        throw new Error("clone is not implemented on abstract LiteralExpression");
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
    
        if(hint && hint.is(ctx, StringEnumType)) {
            let enumType = hint.to(ctx, StringEnumType) as StringEnumType;
            if(enumType.values.includes(this.value)) {
                this.inferredType = hint;
            }
            else {
                ctx.parser.customError(`Expected a value from ${hint.getShortName()} but found ${this.value}`, this.location);
            }
        }

        else {
            this.inferredType = BuiltinModules.String!;
        }

        this.checkHint(ctx, false);
        return this.inferredType;
    }


    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new StringLiteralExpression(this.location, this.value);
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

    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new BinaryStringLiteralExpression(this.location, this.value);
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
        ctx.parser.customError("Not implemented", this.location);
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new CharLiteralExpression(this.location, this.value);
    }
}

export class IntLiteralExpression extends LiteralExpression {
    value: string;
    isNegative: boolean = false;

    constructor(location: SymbolLocation, value: string){
        super(location, "int_literal");
        this.value = value;
    }

    setNegative(isNegative: boolean){
        this.isNegative = isNegative;
    }

    infer(ctx: Context, hint: DataType | null = null, meta?: InferenceMeta): DataType {
        this.setHint(hint);

        if(hint && (hint.dereference() instanceof BasicType)) {
            if(!checkLiteralIntStorage(this.value, (hint.dereference() as BasicType).kind as BasicTypeKind, this.isNegative)){
                ctx.parser.customError("Literal value does not fit in the given type", this.location);
            }

            this.inferredType = hint;
        }

        else if (!hint) {
            this.inferredType = new BasicType(this.location, findLeastSufficientType(this.value));
        }
        else {
            this.inferredType = new BasicType(this.location, findLeastSufficientType(this.value));
            ctx.parser.customError(`Unexpected type, ${hint.getShortName()} expected but found ${this.inferredType?.getShortName()}`, this.location);
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

    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new IntLiteralExpression(this.location, this.value);
    }
}

export class BinaryIntLiteralExpression extends LiteralExpression {
    value: string;
    isNegative: boolean = false;
    constructor(location: SymbolLocation, value: string){
        super(location, "binary_int_literal");
        this.value = value;
    }

    setNegative(isNegative: boolean){
        this.isNegative = isNegative;
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        if(hint && (hint.dereference() instanceof BasicType)) {
            if(!checkLiteralIntStorage(this.value, (hint.dereference() as BasicType).kind as BasicTypeKind, this.isNegative)){
                ctx.parser.customError("Literal value does not fit in the given type", this.location);
            }

            this.inferredType = hint;
        }

        else if (!hint) {
            this.inferredType = new BasicType(this.location, findLeastSufficientType(this.value));
        }
        else {
            ctx.parser.customError("Hint for integer literal must be a basic type or a boolean type", this.location);
        }

        this.setInferredToHint();
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new BinaryIntLiteralExpression(this.location, this.value);
    }
}

export class OctIntLiteralExpression extends LiteralExpression {
    value: string;
    isNegative: boolean = false;
    constructor(location: SymbolLocation, value: string){
        super(location, "oct_int_literal");
        this.value = value;
    }


    setNegative(isNegative: boolean){
        this.isNegative = isNegative;
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        if(hint && (hint.dereference() instanceof BasicType)) {
            if(!checkLiteralIntStorage(this.value, (hint.dereference() as BasicType).kind as BasicTypeKind, this.isNegative)){
                ctx.parser.customError("Literal value does not fit in the given type", this.location);
            }

            this.inferredType = hint;
        }

        else if (!hint) {
            this.inferredType = new BasicType(this.location, findLeastSufficientType(this.value));
        }
        else {
            ctx.parser.customError("Hint for integer literal must be a basic type or a boolean type", this.location);
        }

        this.setInferredToHint();
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new OctIntLiteralExpression(this.location, this.value);
    }
}

export class HexIntLiteralExpression extends LiteralExpression {
    value: string;
    isNegative: boolean = false;
    constructor(location: SymbolLocation, value: string){
        super(location, "hex_int_literal");
        this.value = value;
    }

    setNegative(isNegative: boolean){
        this.isNegative = isNegative;
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        if(hint && (hint.dereference() instanceof BasicType)) {
            if(!checkLiteralIntStorage(this.value, (hint.dereference() as BasicType).kind as BasicTypeKind, this.isNegative)){
                ctx.parser.customError("Literal value does not fit in the given type", this.location);
            }

            this.inferredType = hint;
        }

        else if (!hint) {
            this.inferredType = new BasicType(this.location, findLeastSufficientType(this.value));
        }
        else {
            ctx.parser.customError("Hint for integer literal must be a basic type or a boolean type", this.location);
        }

        this.setInferredToHint();
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new HexIntLiteralExpression(this.location, this.value);
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

        this.checkHint(ctx, false);
        if(hint) {
            // for literal expressions, the inferred type is the hint type when available,
            // so that literals are stored as the expected type in the bytecode
            this.inferredType = hint;
        }
        this.setInferredToHint();
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new FloatLiteralExpression(this.location, this.value);
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

        this.checkHint(ctx, false);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new DoubleLiteralExpression(this.location, this.value);
    }
}

export class TrueLiteralExpression extends LiteralExpression {
    constructor(location: SymbolLocation){
        super(location, "true");
    }

    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        this.inferredType = new BooleanType(this.location);

        this.checkHint(ctx, false);
        return this.inferredType;
    }

    static makeLiteral(location: SymbolLocation): TrueLiteralExpression {
        let literal = new TrueLiteralExpression(location);
        literal.inferredType = new BooleanType(location);
        return literal;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new TrueLiteralExpression(this.location);
    }
}

export class FalseLiteralExpression extends LiteralExpression {
    constructor(location: SymbolLocation){
        super(location, "false");
    }


    infer(ctx: Context, hint: DataType | null = null): DataType {
        this.setHint(hint);

        this.inferredType = new BooleanType(this.location);

        
        this.checkHint(ctx, false);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new FalseLiteralExpression(this.location);
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

    clone(typeMap: { [key: string]: DataType; }, ctx: Context) {
        return new NullLiteralExpression(this.location);
    }
}