/**
 * Filename: GlobalContext.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Contains all global context information from a code generation perspective
 *     For example a lambda expression might be declared locally within another function, but 
 *     for the code generator, it is a function available within the global context
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Symbol } from "../ast/symbol/Symbol";

export class GlobalContext {
    // global symbols
    globalSymbols: Map<string, Symbol> = new Map();

    constructor() {
        // nothing todo here yet
    }

    registerSymbol(symbol: Symbol) {
        // it is okay to overwrite symbols cuz uid is unique
        this.globalSymbols.set(symbol.uid, symbol);
    }

    removeSymbol(symbol: Symbol) {
        this.globalSymbols.delete(symbol.uid);
    }
}
