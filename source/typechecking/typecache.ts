/**
 * Filename: TypeCache.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Hold information about recursive type checking to prevent infinite loops
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { DataType } from "../ast/types/DataType";

export class TypeCache {
    private cache: Map<string, boolean> = new Map();

    /**
     * Check if a type is currently being checked
     * @param type The type to check
     * @returns true if the type is currently being checked, false otherwise
     */
    isChecking(type: DataType): boolean {
        return this.cache.has(type.hash());
    }

    /**
     * Start checking a type
     * @param type The type to start checking
     */
    startChecking(type: DataType) {
        this.cache.set(type.hash(), true);
    }

    /**
     * Stop checking a type
     * @param type The type to stop checking
     */
    stopChecking(type: DataType) {
        this.cache.delete(type.hash());
    }
}

export const globalTypeCache = new TypeCache();