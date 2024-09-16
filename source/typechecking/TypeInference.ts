/**
 * Filename: TypeInference.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Performs type inference, or find a common type for a list of types
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import { Expression } from "../ast/expressions/Expression";
import { InterfaceMethod } from "../ast/other/InterfaceMethod";
import { BlockStatement } from "../ast/statements/BlockStatement";
import { ReturnStatement } from "../ast/statements/ReturnStatement";
import { Context } from "../ast/symbol/Context";
import { ClassType } from "../ast/types/ClassType";
import { DataType } from "../ast/types/DataType";
import { FunctionType } from "../ast/types/FunctionType";
import { GenericType } from "../ast/types/GenericType";
import { InterfaceType } from "../ast/types/InterfaceType";
import { StructField, StructType } from "../ast/types/StructType";
import { UnsetType } from "../ast/types/UnsetType";
import { VariantConstructorType } from "../ast/types/VariantConstructorType";
import { VoidType } from "../ast/types/VoidType";
import { matchDataTypes } from "./TypeChecking";

/**
 * Used to infer the return type of a function, given a list of return statements.
 * If the function or method has an unset return type, it will be inferred
 * @param ctx 
 * @param returnStatements 
 */
export function inferFunctionHeader(
    ctx: Context,
    type: "method" | "function",
    returnStatements: { stmt: ReturnStatement, ctx: Context }[],
    header: FunctionType,
    body: BlockStatement | null,
    expr: Expression | null) {

    const definedReturnType: DataType = header.returnType;

    // this should be unreachable, parser makes sure that. if it is, there is an issue with the arguments
    if ((body === null) && (expr === null)) {
        throw ctx.parser.customError(`${type} has no body nor expression`, ctx.location);
    }

    // if we have unset, we need to infer the type based on the return statements
    if (definedReturnType instanceof UnsetType) {
        /**
         * If it is a body, we have to go through all return statements and make sure they align
         */
        if (body !== null) {
            body.infer(ctx);

            // list of return types from the return statements
            let returnTypes: DataType[] = [];

            // if a single void is found (meaning a return without value), the return type is void
            let voidFound = false;

            for (const ret of returnStatements) {
                let retType = ret.stmt.getReturnType(ret.ctx);
                returnTypes.push(retType);
                if (retType instanceof VoidType) {
                    voidFound = true;
                }
            }

            /**
             * Case 1: Not a single return statement
             */
            if (returnTypes.length === 0) {
                header.returnType = new VoidType(ctx.location);
            }
            /**
             * Case 2: At least one void is found, then all must me void
             */
            else if (voidFound) {
                let allVoid = returnTypes.every((t) => t instanceof VoidType);
                if (!allVoid) {
                    throw ctx.parser.customError(`Mixed return data types for ${type}`, body.location);
                }

                header.returnType = new VoidType(ctx.location);
            }

            /**
             * Case 3: Make sure all return types are the same
             */
            else {
                let allMatch = findCompatibleTypes(ctx, returnTypes);
                if (allMatch === null) {
                    throw ctx.parser.customError(`Mixed return data types for ${type}`, body.location);
                }

                header.returnType = allMatch;
            }
        }
        /**
         * If it is an expression, we can infer the type from the expression
         */
        else {
            header.returnType = expr!.inferReturn(ctx);
        }
    }

    // now if we have void, all shall be void
    else if (definedReturnType instanceof VoidType) {
        if (body !== null) {
            body.infer(ctx);
            for (const ret of returnStatements) {
                let retType = ret.stmt.getReturnType(ret.ctx);
                if (!(retType instanceof VoidType)) {
                    ctx.parser.customError(`Mixed return data types for ${type}`, body.location);
                }
            }
        }
        else {
            // WARNING: for expression, void is ALLOWED, the output is just discarded
            let retType = expr!.inferReturn(ctx);
            if (!(retType instanceof VoidType)) {
                expr?.setHint(new VoidType(expr.location));
            }
        }

        header.returnType = new VoidType(ctx.location);
    }

    else {
        if (body) {
            body.infer(ctx);
            if (returnStatements.length === 0) {
                ctx.parser.customError(`${type} is required to return a value`, body.location);
            }

            // all return types must match the defined return type
            for (let i = 0; i < returnStatements.length; i++) {
                let retType = returnStatements[i].stmt.getReturnType(returnStatements[i].ctx);
                if (!matchDataTypes(ctx, definedReturnType, retType, false).success) {
                    throw ctx.parser.customError(`Return type ${retType.shortname()} does not match the defined return type ${definedReturnType.shortname()}`, returnStatements[i].stmt.location);
                }
                
                returnStatements[i].stmt.returnExpression?.setHint(definedReturnType);
            }
        }
        else {
            let retType = expr!.inferReturn(ctx, definedReturnType);
            if (!matchDataTypes(ctx, definedReturnType, retType, false).success) {
                throw ctx.parser.customError(`Return type ${retType.shortname()} does not match the defined return type ${definedReturnType.shortname()}`, expr!.location);
            }
        }
    }

    header.resolve(ctx);
    // We must update the hints of all return values, with the common type,
    // so the code generator can generate the correct code to cast to the final adequate type
    for (const ret of returnStatements) {
        // maybe set hint is just enough?
        ret.stmt.returnExpression?.inferReturn(ret.ctx, header.returnType);
    }
}

export function findCompatibleTypes(ctx: Context, t: DataType[]): DataType | null {

    function findCommonSupertypeOrCompatibleType(ctx: Context, t1: DataType, t2: DataType): DataType | null {
        // case 1: two variant constructors, make sure they have the same parent and return the parent
        if (t1.is(ctx, VariantConstructorType) && t2.is(ctx, VariantConstructorType)) {
            let e1 = t1.to(ctx, VariantConstructorType) as VariantConstructorType;
            let e2 = t2.to(ctx, VariantConstructorType) as VariantConstructorType;

            if (e1._parent === e2._parent) {
                return e1._parent;
            }
            else {
                return null;
            }
        }

        if (t1.is(ctx, StructType) && t2.is(ctx, StructType)) {
            let e1 = t1.to(ctx, StructType) as StructType;
            let e2 = t2.to(ctx, StructType) as StructType;

            // find the common fields
            let e1Fields = e1.fields.map(f => f.name);
            let e2Fields = e2.fields.map(f => f.name);

            let commonFields = e1Fields.filter(f => e2Fields.includes(f));
            let commonFieldsTypes: StructField[] = [];

            // make sure field types match
            for (let field of commonFields) {
                let e1Type = e1.fields.find(f => f.name === field)!.type;
                let e2Type = e2.fields.find(f => f.name === field)!.type;

                let result = matchDataTypes(ctx, e1Type, e2Type, false);
                if (!result.success) {
                    let result = matchDataTypes(ctx, e2Type, e1Type, false);
                    if (!result.success) {
                        return null;
                    }
                    else {
                        commonFieldsTypes.push(new StructField(ctx.location, field, e2Type));
                    }
                }
                else {
                    commonFieldsTypes.push(new StructField(ctx.location, field, e1Type));
                }
            }

            if (commonFieldsTypes.length === 0) {
                return null;
            }

            // if all fields match, return the common type
            return new StructType(ctx.location, commonFieldsTypes);
        }

        if ((t1.is(ctx, InterfaceType) && t2.is(ctx, InterfaceType)) || (t1.is(ctx, ClassType) && t2.is(ctx, InterfaceType)) || (t1.is(ctx, InterfaceType) && t2.is(ctx, ClassType))) {
            let et2 = t2.to(ctx, InterfaceType) as InterfaceType;
            let et1 = t1.to(ctx, InterfaceType) as InterfaceType;

            if (et1.methods.length === 0 || et2.methods.length === 0) {
                return null;
            }

            let commonMethods: InterfaceMethod[] = [];

            // find common methods
            for (let i = 0; i < et1.methods.length; i++) {
                let m1 = et1.methods[i];
                let m2 = et2.getMethodBySignature(ctx, m1.name, m1.header.parameters.map(p => p.type), m1.header.returnType);

                if (m2.length !== 1) {
                    continue
                }
                else {
                    commonMethods.push(m1);
                }
            }

            if (commonMethods.length === 0) {
                // we swap the types and try again

                // find common methods
                for (let i = 0; i < et2.methods.length; i++) {
                    let m1 = et2.methods[i];
                    let m2 = et1.getMethodBySignature(ctx, m1.name, m1.header.parameters.map(p => p.type), m1.header.returnType);

                    if (m2.length !== 1) {
                        continue
                    }
                    else {
                        commonMethods.push(m1);
                    }
                }

                if (commonMethods.length === 0) {
                    return null;
                }
            }

            if (commonMethods.length === 0) {
                return null;
            }

            return new InterfaceType(ctx.location, commonMethods, []);
        }

        return null;
    }


    // Check for base cases
    if (t.length === 0) {
        throw ctx.parser.customError("Cannot find a common type for an empty list of types", ctx.location);
    }

    // If there's only one type, it's trivially compatible with itself.
    if (t.length === 1) {
        return t[0];
    }

    // Start with the assumption that the first type could be compatible with all
    let baseType = t[0];

    let lastStop = 0;

    for (let i = 1; i < t.length; i++) {
        // Check if baseType is compatible with t[i]
        let result = matchDataTypes(ctx, baseType, t[i], false);
        if (result.success) {
            // If baseType is a supertype or compatible with t[i], no changes needed
            continue;
        } else {
            // Check if t[i] is a supertype or compatible with baseType
            result = matchDataTypes(ctx, t[i], baseType, false);
            if (result.success) {
                // Update baseType to the more general type
                baseType = t[i];
            } else {
                // No direct compatibility found, attempt to find a common supertype or compatible type
                let commonType = findCommonSupertypeOrCompatibleType(ctx, baseType, t[i]);
                if (commonType) {
                    baseType = commonType;

                    /*if(lastStop > i) {
                        return null;
                    }*/

                    // now we will have to reset the loop
                    lastStop = i;
                    i = -1;
                } else {
                    // If no common type can be found, the types are incompatible
                    return null;
                }
            }
        }
    }

    // After checking all types, baseType is the most specific common compatible type
    return baseType;
}


/**
 * Generates a signature from a list of types
 * @param types 
 * @returns 
 */
export function signatureFromGenerics(types: DataType[]): string {
    return types.map(t => t.serialize()).join("-");
}

/**
 * Creates a map with the generic types names as keys and their concrete types.
 * Also makes sure that the generics constraints are respected
 * @param generics 
 * @param concreteTypes 
 */
export function buildGenericsMaps(ctx: Context, generics: GenericType[], concreteTypes: DataType[]): { [key: string]: DataType } {
    if (generics.length != concreteTypes.length) {
        throw ctx.parser.customError(`Expected ${generics.length} generics, but got ${concreteTypes.length}`, ctx.location);
    }

    let map: { [key: string]: DataType } = {};

    for (let i = 0; i < generics.length; i++) {
        let generic = generics[i];
        let concrete = concreteTypes[i];

        if (generic.constraint) {
            let ok = generic.constraint.checkType(ctx, concrete);
            if (!ok) {
                throw ctx.parser.customError(`Generic type ${generic.name} does not respect the constraints: ${generic.constraint.types.map(e => e.shortname()).join(" | ")}`, ctx.location);
            }
        }

        map[generic.name] = concrete;
    }

    return map;
}