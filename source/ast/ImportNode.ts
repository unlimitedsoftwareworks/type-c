/**
 * Filename: ImportNode.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an AST node for an import statement
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import {SymbolLocation} from "./symbol/SymbolLocation";


export class ImportNode {
    /**
     * The path to the file to import.
     * for example: std.io.console
     * [std, io, console]
     */
    basePath: string[];

    /**
     * The alias for the import.
     * for example: std.io.console as Console
     * [Console]
     */
    alias: string;

    /**
     * The actual name of the import.
     * for example: std.io.console as Console
     * [console]
     */
    actualName: string;

    subImports: string[];

    location: SymbolLocation;

    constructor(location: SymbolLocation, basePath: string[], alias: string, actualName: string, subImports: string[]=[]) {
        this.location = location;
        this.basePath = basePath;
        this.alias = alias;
        this.actualName = actualName;
        this.subImports = subImports;
    }
}