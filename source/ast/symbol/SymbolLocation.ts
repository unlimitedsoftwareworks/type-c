/**
 * Filename: SymbolLocation.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Tracks the location of a symbol in a file
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


export class SymbolLocation {
    file: string;
    line: number;
    col: number;
    pos: number;

    constructor(file: string, line: number, column: number, rawPosition: number){
        this.file = file;
        this.line = line;
        this.col = column;
        this.pos = rawPosition;
    }

    toString(){
        return `${this.file}:${this.line}:${this.col}`;
    }
}