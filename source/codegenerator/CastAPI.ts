/**
 * Filename: CastAPI.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Helper functions for generating cast instructions
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

export type CastType = "u8" | "u16" | "u32" | "u64" | "i8" | "i16" | "i32" | "i64" | "f32" | "f64";

export function generateCastInstruction(from: CastType, to: CastType, reg: string): string[][] {
    const typeInfo = {
        u8: { size: 1, type: 'u' },
        u16: { size: 2, type: 'u' },
        u32: { size: 4, type: 'u' },
        u64: { size: 8, type: 'u' },
        i8: { size: 1, type: 'i' },
        i16: { size: 2, type: 'i' },
        i32: { size: 4, type: 'i' },
        i64: { size: 8, type: 'i' },
        f32: { size: 4, type: 'f' },
        f64: { size: 8, type: 'f' }
    };

    if (!(from in typeInfo) || !(to in typeInfo)) {
        throw new Error("Invalid type");
    }

    const instructions: string[][] = [];
    let currentType: CastType = from;

    // Handle special cases first
    if (from.startsWith('u') && to.startsWith('f')) {
        // Upcast to the size of the target floating point, if needed
        if (typeInfo[from].size < typeInfo[to].size) {
            instructions.push(["upcast_u", reg, typeInfo[from].size.toString(), typeInfo[to].size.toString()]);
            currentType = `u${typeInfo[to].size * 8}` as CastType;
        }
        else if (typeInfo[from].size > typeInfo[to].size) {
            instructions.push(["dcast_u", reg, typeInfo[from].size.toString(), typeInfo[to].size.toString()]);
            currentType = `u${typeInfo[to].size * 8}` as CastType;
        }
        // Convert to the corresponding signed type
        instructions.push([`cast_${currentType}_i${typeInfo[to].size * 8}`, reg]);
        // Convert to the target floating point
        instructions.push([`cast_i${typeInfo[to].size * 8}_${to}`, reg]);
        return instructions;
    }

    // Handle float to int conversion
    if (from.startsWith('f') && !to.startsWith('f')) {
        const intermediateType = `i${typeInfo[from].size * 8}` as CastType;
        instructions.push([`cast_${from}_${intermediateType}`, reg]);
        currentType = intermediateType;
    }

    // Handle int to float conversion
    if (!from.startsWith('f') && to.startsWith('f')) {
        const intermediateType = `i${typeInfo[to].size * 8}` as CastType;
        if (typeInfo[currentType].size !== typeInfo[to].size) {
            instructions.push(["upcast_i", reg, typeInfo[currentType].size.toString(), typeInfo[to].size.toString()]);
            currentType = intermediateType;
        }
        instructions.push([`cast_${currentType}_${to}`, reg]);
        return instructions;
    }

    // Handle upcasting or downcasting
    if (typeInfo[currentType].size !== typeInfo[to].size) {
        const op = typeInfo[currentType].size < typeInfo[to].size ? "upcast" : "dcast";
        const typeChar = currentType[0];
        instructions.push([`${op}_${typeChar}`, reg, typeInfo[currentType].size.toString(), typeInfo[to].size.toString()]);
        currentType = `${typeChar}${typeInfo[to].size * 8}`.toLowerCase() as CastType;
    }

    // Handle any remaining type conversions
    if (currentType !== to) {
        instructions.push([`cast_${currentType}_${to}`, reg]);
    }

    return instructions;
}