/**
 * Filename: OperatorOverloadState.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Describes the state of an operator overload
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { InterfaceMethod } from "./InterfaceMethod";

export class OperatorOverloadState {
    isMethodCall: boolean = false; // true if this binary expression is a method call (operator overloading)
    methodRef: InterfaceMethod | null = null; // pointer to the method which overloads this operator

    setMethodRef(method: InterfaceMethod){
        this.isMethodCall = true;
        this.methodRef = method;
    }
}