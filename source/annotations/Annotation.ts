/**
 * Filename: Annotation.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an annotation, such as @ deprecated
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

export class Annotation {
    name: string;
    parameters: Map<string, any>;

    constructor(name: string){
        this.name = name;
        this.parameters = new Map<string, any>();
    }

    clone(): Annotation {
        throw new Error("Annotation.clone() is not implemented");
    }
}