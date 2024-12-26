/**
 * Filename: ObjectKeysSegment.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Segment that contains the struct keys and their corresponding values
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { StructField } from "../ast/types/StructType";
import { DataWriter } from "./DataWriter";
import { PerfectHashData } from "./hashing/GenerateHash";

export class ObjectKeysSegment {
    json: string;
    constructor() {
        let map = StructField.fieldIdMap;
        this.json = JSON.stringify(map);
    }
    getByteSize() {
        return this.json.length;
    }

    serialize() {

        let buffer = new ArrayBuffer(this.json.length);
        let view = new Uint8Array(buffer);
        for (let i = 0; i < this.json.length; i++) {
            view[i] = this.json.charCodeAt(i);
        }
        return buffer;
    }
}