/**
 * Filename: FunctionInference.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Used to capture recursive function evaluation to prevent infinite loops
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { DeclaredFunction } from "../ast/symbol/DeclaredFunction";

export class FunctionInferenceCache {
    // used to capture recursive function evaluation to prevent infinite loops
    static cache: { [key: string]: DeclaredFunction } = {};

    static push(fn: DeclaredFunction) {
        this.cache[fn.hash()] = fn;
    }

    static pop(fn: DeclaredFunction) {
        delete this.cache[fn.hash()];
    }

    static has(fn: DeclaredFunction) {
        return this.cache[fn.hash()] != undefined;
    }

    static reset() {
        FunctionInferenceCache.cache = {};
    }
}
