/**
 * Filename: DeprecatedAnnotation.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a deprecated annotation, such as @ deprecated
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Annotation } from "./Annotation";

export class DeprecatedAnnotation extends Annotation {
    constructor(message?: string){
        super("deprecated");
        if(message){
            this.parameters.set("message", message);
        }
    }
}