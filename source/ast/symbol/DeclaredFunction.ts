/**
 * Filename: DeclaredFunction.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Models a declared function
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Expression } from "../expressions/Expression";
import { FunctionPrototype } from "../other/FunctionPrototype";
import { BlockStatement } from "../statements/BlockStatement";
import { FunctionDeclarationStatement } from "../statements/FunctionDeclarationStatement";
import { ReturnStatement } from "../statements/ReturnStatement";
import { Context } from "./Context";
import { Symbol } from "./Symbol";
import { SymbolLocation } from "./SymbolLocation";


export class DeclaredFunction extends Symbol {
    prototype: FunctionPrototype;
    expression: Expression | null;
    body: BlockStatement | null;

    context: Context;

    // cache of return statements, used for type checking
    returnStatements: {stmt: ReturnStatement, ctx: Context}[] = [];

    constructor(location: SymbolLocation, context: Context,  prototype: FunctionPrototype, expression: Expression | null, body: BlockStatement | null) {
        super(location, "function", prototype.name);
        this.prototype = prototype;
        this.expression = expression;
        this.body = body;
        this.context = context;

        // add the function to the context
        context.setOwner(this);

        // add the parameters to the context
        for (let i = 0; i < prototype.header.parameters.length; i++) {
            context.addSymbol(prototype.header.parameters[i]);
        }
    }
}