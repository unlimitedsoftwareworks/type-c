/**
 * Filename: ExportAnnotation.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models an export annotation, such as @export
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Annotation } from "./Annotation";

export class ExportAnnotation extends Annotation {
    constructor(id: string){
        super("export");
        this.parameters.set("id", id);
    }

    clone(): Annotation {
        return new ExportAnnotation(this.parameters.get("id") as string);
    }
}