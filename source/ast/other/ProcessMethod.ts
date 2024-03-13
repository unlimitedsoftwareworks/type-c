/**
 * Filename: ProcessMethod.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     A process method is a method defined in a process
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Expression } from "../expressions/Expression";
import { BlockStatement } from "../statements/BlockStatement";
import { ReturnStatement } from "../statements/ReturnStatement";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { Context } from "../symbol/Context";
import { InterfaceMethod } from "./InterfaceMethod";


export class ProcessMethod {
    location: SymbolLocation;

    // interface method
    imethod: InterfaceMethod;

    // if the method has an expression
    expression: Expression | null = null;
    // or a statement block
    body: BlockStatement | null = null;

    context: Context;

    isEvent: boolean;

    /**
     * List of return statements in the method, used for type checking
     */
    returnStatements: ReturnStatement[] = [];

    constructor(location: SymbolLocation, context: Context, imethod: InterfaceMethod, body: BlockStatement | null, expression: Expression | null, isEvent: boolean) {
        this.location = location;
        this.imethod = imethod;
        this.context = context;
        this.body = body;
        this.expression = expression;
        this.isEvent = isEvent;
    }
}