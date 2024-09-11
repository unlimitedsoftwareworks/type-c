/**
 * Filename: LockType.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Models a lock used for synchronization between threads
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "./DataType"
import { GenericType } from "./GenericType";
import { UnsetType } from "./UnsetType";


export class LockType extends DataType {
    returnType: DataType;
    
    constructor(location: SymbolLocation, returnType: DataType) {
        super(location, "lock");
        this.returnType = returnType;
    }

    resolve(ctx: Context) {
        /**
         * Must observe the behavior of unset type within a lock, because often when it is unset, 
         * it is because the lock is created within a new expression and the type will be inferred
         * from the new expression argument. Otherwise it shall always be set.
         */
        if(this.returnType.is(ctx, UnsetType)) {
            throw ctx.parser.customError("Cannot have lock of unset type", this.location);
        }

        this.returnType.resolve(ctx);
    }

    shortname(): string {
        return `lock<${this.returnType.shortname()}>`
    }

    serialize(unpack: boolean = false): string {
        return `@lock<${this.returnType.serialize(unpack)}>`
    }

    clone(genericsTypeMap: {[key: string]: DataType}): LockType{
        return new LockType(this.location, this.returnType.clone(genericsTypeMap));
    }

    getGenericParametersRecursive(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}, typeMap: {[key: string]: DataType}) {
        if(!originalType.is(ctx, LockType)){
            throw ctx.parser.customError(`Expected promise type when mapping generics to types, got ${originalType.shortname()} instead.`, this.location);
        }

        let promiseType = originalType.to(ctx, LockType) as LockType;
        this.returnType.getGenericParametersRecursive(ctx, promiseType.returnType, declaredGenerics, typeMap);
    }

}