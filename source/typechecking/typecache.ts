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
    private checkCache: Map<string, boolean> = new Map();
    private typeCache: Map<string, DataType> = new Map();

    /**
     * Check if a type is currently being checked
     * @param type The type to check
     * @returns true if the type is currently being checked, false otherwise
     */
    isChecking(type: DataType): boolean {
        return this.checkCache.has(type.hash());
    }

    /**
     * Start checking a type
     * @param type The type to start checking
     */
    startChecking(type: DataType) {
        this.checkCache.set(type.hash(), true);
    }

    /**
     * Stop checking a type
     * @param type The type to stop checking
     */
    stopChecking(type: DataType) {
        this.checkCache.delete(type.hash());
    }

    /**
     * Get a type from the cache
     * @param type The type to get from the cache
     * @returns The type from the cache
     */
    get(type: DataType): DataType | undefined {
        return this.typeCache.get(type.hash());
    }

    /**
     * Set a type in the cache
     * @param type The type to set in the cache
     * @param value The value to set
     */
    set(type: DataType) {
        this.typeCache.set(type.hash(), type);
    }
}

export const globalTypeCache = new TypeCache();