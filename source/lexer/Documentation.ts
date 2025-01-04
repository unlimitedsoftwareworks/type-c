/**
 * Filename: Documentation.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Documentation for tokens, a documentation is a special comment /** @brief etc  
 *     that is used to describe the token in a more human readable format.
 *     captured data:
 *     - brief: @brief
 *     - extraComments: @extraComments
 *     - props: @x something something
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { SymbolLocation } from "../ast/symbol/SymbolLocation";

export class Documentation {
    brief?: string;
    extraComments?: string;

    props: {
        [key: string]: string;
    } = {};

    location: SymbolLocation;

    constructor(location: SymbolLocation) {
        this.location = location;
    }
}