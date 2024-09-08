/**
 * Filename: FunctionGenerator
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Generate IR instructions for a function/class method or a lambda function 
 *     or global code (if attribute isGlobal is set to true)
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { ArrayConstructionExpression } from "../ast/expressions/ArrayConstructionExpression";
import { AwaitExpression } from "../ast/expressions/AwaitExpression";
import { BinaryExpression, BinaryExpressionOperator } from "../ast/expressions/BinaryExpression";
import { CastExpression } from "../ast/expressions/CastExpression";
import { CoroutineConstructionExpression } from "../ast/expressions/CoroutineConstructionExpression";
import { ElementExpression } from "../ast/expressions/ElementExpression";
import { Expression } from "../ast/expressions/Expression";
import { FunctionCallExpression } from "../ast/expressions/FunctionCallExpression";
import { IfElseExpression } from "../ast/expressions/IfElseExpression";
import { IndexAccessExpression } from "../ast/expressions/IndexAccessExpression";
import { IndexSetExpression } from "../ast/expressions/IndexSetExpression";
import { InstanceCheckExpression } from "../ast/expressions/InstanceCheckExpression";
import { LambdaDefinition, LambdaExpression } from "../ast/expressions/LambdaExpression";
import { LetInExpression } from "../ast/expressions/LetInExpression";
import { BinaryStringLiteralExpression, CharLiteralExpression, DoubleLiteralExpression, FalseLiteralExpression, FloatLiteralExpression, HexIntLiteralExpression, IntLiteralExpression, LiteralExpression, NullLiteralExpression, StringLiteralExpression, TrueLiteralExpression } from "../ast/expressions/LiteralExpression";
import { MatchExpression } from "../ast/expressions/MatchExpression";
import { MemberAccessExpression } from "../ast/expressions/MemberAccessExpression";
import { NamedStructConstructionExpression } from "../ast/expressions/NamedStructConstructionExpression";
import { NewExpression } from "../ast/expressions/NewExpression";
import { NullableMemberAccessExpression } from "../ast/expressions/NullableMemberAccessExpression";
import { SpawnExpression } from "../ast/expressions/SpawnExpression";
import { ThisExpression } from "../ast/expressions/ThisExpression";
import { TupleConstructionExpression } from "../ast/expressions/TupleConstructionExpression";
import { TupleDeconstructionExpression } from "../ast/expressions/TupleDeconstructionExpression";
import { UnaryExpression } from "../ast/expressions/UnaryExpression";
import { UnnamedStructConstructionExpression } from "../ast/expressions/UnnamedStructConstructionExpression";
import { ClassMethod } from "../ast/other/ClassMethod";
import { InterfaceMethod } from "../ast/other/InterfaceMethod";
import { BlockStatement } from "../ast/statements/BlockStatement";
import { BreakStatement } from "../ast/statements/BreakStatement";
import { ContinueStatement } from "../ast/statements/ContinueStatement";
import { DoWhileStatement } from "../ast/statements/DoWhileStatement";
import { ExpressionStatement } from "../ast/statements/ExpressionStatement";
import { ForeachStatement } from "../ast/statements/ForeachStatement";
import { ForStatement } from "../ast/statements/ForStatement";
import { FunctionDeclarationStatement } from "../ast/statements/FunctionDeclarationStatement";
import { IfStatement } from "../ast/statements/IfStatement";
import { MatchStatement } from "../ast/statements/MatchStatement";
import { ReturnStatement } from "../ast/statements/ReturnStatement";
import { Statement } from "../ast/statements/Statement";
import { VariableDeclarationStatement } from "../ast/statements/VariableDeclarationStatement";
import { WhileStatement } from "../ast/statements/WhileStatement";
import { Context } from "../ast/symbol/Context";
import { DeclaredFunction } from "../ast/symbol/DeclaredFunction";
import { DeclaredType } from "../ast/symbol/DeclaredType";
import { DeclaredVariable } from "../ast/symbol/DeclaredVariable";
import { FunctionArgument } from "../ast/symbol/FunctionArgument";
import { Symbol } from "../ast/symbol/Symbol";
import { SymbolLocation } from "../ast/symbol/SymbolLocation";
import { VariablePattern } from "../ast/symbol/VariablePattern";
import { ArrayType } from "../ast/types/ArrayType";
import { BasicType } from "../ast/types/BasicType";
import { BooleanType } from "../ast/types/BooleanType";
import { ClassType } from "../ast/types/ClassType";
import { DataType } from "../ast/types/DataType";
import { EnumType } from "../ast/types/EnumType";
import { FFIMethodType } from "../ast/types/FFIMethodType";
import { FunctionType } from "../ast/types/FunctionType";
import { InterfaceType } from "../ast/types/InterfaceType";
import { MetaClassType, MetaType, MetaVariantConstructorType } from "../ast/types/MetaTypes";
import { NullableType } from "../ast/types/NullableType";
import { StructType } from "../ast/types/StructType";
import { VariantConstructorType } from "../ast/types/VariantConstructorType";
import { VariantType } from "../ast/types/VariantType";
import { VoidType } from "../ast/types/VoidType";
import { canCastTypes } from "../typechecking/TypeChecking";
import { signatureFromGenerics } from "../typechecking/TypeInference";
import { IRInstruction, IRInstructionType } from "./bytecode/IR";
import { CastType, generateCastInstruction } from "./CastAPI";
import { arrayGetIndexType, arraySetIndexType, classGetFieldType, classSetFieldType, constType, fnSetArgType, getBinaryInstruction, getUnaryInstruction, globalType, popStackType, pushStackType, retType, structGetFieldType, structSetFieldType, tmpType } from "./CodeGenTypes";
import { allocateRegisters } from "./RegisterAllocator";
import { getDataTypeByteSize } from "./utils";

export type FunctionGenType = DeclaredFunction | ClassMethod | LambdaDefinition;

/**
 * Utility functions
 */
export function isLocalVariable(expr: Expression, ctx: Context) {
    if (expr instanceof ElementExpression) {
        let symScope = ctx.lookupScope(expr.name);

        if (symScope?.sym instanceof DeclaredVariable || symScope?.sym instanceof VariablePattern) {
            return symScope.scope == "local"
        }
    }
    return false;
}

export function isFunctionArgument(expr: Expression, ctx: Context) {
    if (expr instanceof ElementExpression) {
        let symScope = ctx.lookupScope(expr.name);
        // TODO: check if this is correct
        if ((symScope?.sym instanceof FunctionArgument) && (symScope?.scope == "local")) {
            return true;
        }
    }

    return false;
}

export function isGlobalVariable(expr: Expression, ctx: Context) {
    if (expr instanceof ElementExpression) {
        let symScope = ctx.lookupScope(expr.name);

        if (symScope?.sym instanceof DeclaredVariable || symScope?.sym instanceof VariablePattern) {
            return symScope.scope == "global"
        }
    }
    return false;
}

export function isUpvalueVariable(expr: Expression, ctx: Context) {
    if (expr instanceof ElementExpression) {
        let symScope = ctx.lookupScope(expr.name);

        if (symScope?.sym instanceof DeclaredVariable || symScope?.sym instanceof VariablePattern || symScope?.sym instanceof FunctionArgument) {
            return symScope.scope == "upvalue"
        }
    }
    return false;
}


function fetchElementSymbol(ctx: Context, element: ElementExpression): Symbol | DeclaredFunction | null {
    let name: string = element.name;
    let typeArgs: DataType[] = element.typeArguments;
    let sym = ctx.lookup(name);
    if (sym instanceof DeclaredFunction) {
        if (Object.keys(sym.concreteGenerics).length > 0) {
            let concrete = sym.concreteGenerics.get(signatureFromGenerics(typeArgs));
            if (concrete == null) {
                throw ctx.parser.customError(`Could not find concrete type for generic function ${name} with type arguments ${typeArgs.map((t) => t.toString()).join(", ")}`, sym.location);
            }
            return concrete as DeclaredFunction;
        }
        return sym as DeclaredFunction;
    }
    else if (sym instanceof DeclaredType) {
        /*
         TODO: remove, seems unnecessary
         if(sym instanceof ClassMethod) { 
            let concrete = sym.getConcreteGenerics();
            if (concrete == null) {
                throw ctx.parser.customError(`Could not find concrete type for generic function ${name} with type arguments ${typeArgs.map((t) => t.toString()).join(", ")}`, sym.location);
            }
            return concrete
        }*/
        return sym
    }

    return sym;
}



export class FunctionGenerator {
    // IR instructions
    instructions: IRInstruction[] = [];

    // current function being generated
    fn: FunctionGenType;

    // is global code
    isGlobal: boolean;

    // tmp variables counter
    tmpCounter = 0;

    // labels counter
    lblCounter = 0;

    // graph coloring output
    coloring: Map<string, number> = new Map();

    // spilled variables maps
    spills: Map<string, number> = new Map();

    constructor(fn: FunctionGenType, isGlobal: boolean = false) {
        this.fn = fn;
        this.isGlobal = isGlobal;
    }

    generateTmp(): string {
        return "tmp_" + (this.tmpCounter++);
    }

    generateLabel(): string {
        return "lbl_" + this.fn.context.uuid + ("_" + this.lblCounter++);
    }

    // generates an IR instruction
    i(type: IRInstructionType, ...args: (string | number)[]) {
        if (type == null) {
            throw new Error("IR instruction type is null");
        }

        this.instructions.push(new IRInstruction(type, args));
    }

    srcMapPushLoc(loc: SymbolLocation) {
        this.i("srcmap_push_loc", loc.file, loc.line, loc.col, this.fn.name || "<unknown>");
    }

    srcMapPopLoc() {
        this.i("srcmap_pop_loc");
    }


    destroyTmp(reg: string) {
        this.i("destroy_tmp", reg);
    }

    generate() {
        // generate IR instructions for the function
        if (!this.isGlobal) {
            this.fn.codeGenProps.computeStack();
        }

        this.srcMapPushLoc(this.fn.location);


        this.i("debug", "fn " + this.fn.context.uuid+ ":"+this.fn.name);
        if (!this.isGlobal) {
            this.i("fn", this.fn.context.uuid);
        }

        if(this.fn.body) {
            this.visitStatement(this.fn.body, this.fn.context);
            if(!this.instructions[this.instructions.length - 1].type.startsWith("ret") && !this.isGlobal) {
                this.i("ret_void")
            }
        }
        else {
            this.srcMapPushLoc(this.fn.location);
            let tmp = this.visitExpression(this.fn.expression!, this.fn.context);
            // check if the function is not void
            if((this.fn.codeGenProps.parentFnType) && (this.fn.codeGenProps.parentFnType.returnType) && (this.fn.codeGenProps.parentFnType.returnType.kind != "void") && (this.fn.codeGenProps.parentFnType.returnType.kind != "unset")){
                let instr = retType(this.fn.context, this.fn.codeGenProps.parentFnType.returnType);
                this.i(instr, tmp);
            }
            else {
                this.destroyTmp(tmp);
                this.i("ret_void");
            }
            this.srcMapPopLoc();
        }


        this.dumpIR();
        this.allocateRegisters();
    
    }

    allocateRegisters(){
        // allocate registers
        //this.instructions = this.instructions.filter((i) => !i.type.startsWith("debug") && !i.type.startsWith("srcmap"));
        //this.instructions = this.instructions.filter((i) => !i.type.startsWith("srcmap"));
        //this.instructions = instructions;
        //console.log(this.instructions.map(e => e.toString()).join("\n"))
        let {coloring, spills, instructions} = allocateRegisters(this.fn.codeGenProps, this.instructions);
        this.instructions = instructions;
        this.applyColoring(coloring);
        this.applySpills(spills);
    }
    applyColoring(coloring: Map<string, number>){
        this.coloring = coloring
    }

    applySpills(spills: Map<string, number>){
        this.spills = spills
    }

    /**
     * Visits an expression and generates IR instructions for it.
     * Returns the register that the result of the expression is stored in.
     * @param expr the expression to visit
     * @param ctx active context of the expression
     */
    visitExpression(expr: Expression, ctx: Context): string {
        let tmp = ""; // placeholder for the result of the expression
        /**
         * Checks for all the following expressions and calls the corresponding visit method:
         * ArrayConstructionExpression		ElementExpression			IndexSetExpression			MatchExpression			SpawnExpression			UnnamedStructConstructionExpression
AwaitExpression			Expression				InstanceCheckExpression		MemberAccessExpression		ThisExpression
BinaryExpression			FunctionCallExpression		LambdaExpression			NamedStructConstructionExpression	TupleConstructionExpression
CastExpression			IfElseExpression			LetInExpression			NewExpression			TupleDeconstructionExpression
CoroutineConstructionExpression	IndexAccessExpression		LiteralExpression			NullableMemberAccessExpression	UnaryExpression
         */
        if (expr instanceof ArrayConstructionExpression) tmp = this.visitArrayConstructionExpression(expr, ctx);
        else if (expr instanceof ElementExpression) tmp = this.visitElementExpression(expr, ctx);
        else if (expr instanceof IndexAccessExpression) tmp = this.visitIndexAccessExpression(expr, ctx);
        else if (expr instanceof IndexSetExpression) tmp = this.visitIndexSetExpression(expr, ctx);
        else if (expr instanceof MatchExpression) tmp = this.visitMatchExpression(expr, ctx);
        else if (expr instanceof UnnamedStructConstructionExpression) tmp = this.visitUnnamedStructConstructionExpression(expr, ctx);
        else if (expr instanceof InstanceCheckExpression) tmp = this.visitInstanceCheckExpression(expr, ctx);
        else if (expr instanceof MemberAccessExpression) tmp = this.visitMemberAccessExpression(expr, ctx);
        else if (expr instanceof ThisExpression) tmp = this.visitThisExpression(expr, ctx);
        else if (expr instanceof BinaryExpression) tmp = this.visitBinaryExpression(expr, ctx);
        else if (expr instanceof FunctionCallExpression) tmp = this.visitFunctionCallExpression(expr, ctx);
        else if (expr instanceof LambdaExpression) tmp = this.visitLambdaExpression(expr, ctx);
        else if (expr instanceof NamedStructConstructionExpression) tmp = this.visitNamedStructConstructionExpression(expr, ctx);
        else if (expr instanceof TupleConstructionExpression) tmp = this.visitTupleConstructionExpression(expr, ctx);
        else if (expr instanceof TupleDeconstructionExpression) tmp = this.visitTupleDeconstructionExpression(expr, ctx);
        else if (expr instanceof CastExpression) tmp = this.visitCastExpression(expr, ctx);
        else if (expr instanceof IfElseExpression) tmp = this.visitIfElseExpression(expr, ctx);
        else if (expr instanceof LetInExpression) tmp = this.visitLetInExpression(expr, ctx);
        else if (expr instanceof NewExpression) tmp = this.visitNewExpression(expr, ctx);
        else if (expr instanceof CoroutineConstructionExpression) tmp = this.visitCoroutineConstructionExpression(expr, ctx);
        else if (expr instanceof LiteralExpression) tmp = this.visitLiteralExpression(expr, ctx);
        else if (expr instanceof NullableMemberAccessExpression) tmp = this.visitNullableMemberAccessExpression(expr, ctx);
        else if (expr instanceof UnaryExpression) tmp = this.visitUnaryExpression(expr, ctx);
        else throw new Error("Invalid expression " + expr.toString());
        

        if ((tmp != "")) {
            let inferredType = expr.inferredType?.dereference();
            let hintType = expr.hintType?.dereference();

            if ((hintType != undefined) && (hintType.kind != "void")) {
                let requireSafe = (inferredType instanceof NullableType) || (hintType instanceof NullableType);
                tmp = this.visitCastExpression(new CastExpression(expr.location, expr, hintType, requireSafe ? "safe" : "regular"), ctx, tmp);
            }
        }
        this.srcMapPopLoc()
        return tmp;
    }

    visitElementExpression(expr: ElementExpression, ctx: Context): string {
        this.i("debug", "element " + expr.name);

        let symScope = ctx.lookupScope(expr.name);
        if (symScope == null) {
            throw new Error("Undefined variable " + expr.name);
        }


        const sym = symScope.sym;
        if (sym instanceof DeclaredVariable) {
            let tmp = this.generateTmp();
            let instruction = tmpType(ctx, sym.annotation!);

            if (symScope.scope == "global") {
                this.i(instruction, tmp, "global", sym.uid);
            }
            else if (symScope.scope == "local") {
                this.i(instruction, tmp, "local", sym.uid);
            }
            else {
                ctx.lookupScope(expr.name)
                throw ctx.parser.customError("Upvalues are not supported in bytecode generation", expr.location);
            }

            return tmp;
        }
        else if (sym instanceof VariablePattern) {
            // like regular local variable
            let tmp = this.generateTmp();
            let instruction = tmpType(ctx, sym.type);
            this.i(instruction, tmp, "local", sym.uid);
            return tmp;
        }
        else if (sym instanceof FunctionArgument) {
            let tmp = this.generateTmp();
            let instruction = tmpType(ctx, sym.type);
            this.i(instruction, tmp, "arg", sym.uid);
            return tmp;
        }
        else if (sym instanceof DeclaredFunction) {
            let tmp = this.generateTmp();
            let fnCtxID = ""
            // in case of generics:
            let signature = signatureFromGenerics(expr.typeArguments);

            if (sym.isGeneric()) {
                let concreteFn = sym.getConcreteMethod(signature);
                fnCtxID = concreteFn.context.uuid;
            }
            else {
                fnCtxID = sym.context.uuid;
            }

            let instruction = tmpType(ctx, sym.prototype.header);
            this.i(instruction, tmp, "func", fnCtxID);

            return tmp;
        }
        else {
            throw new Error("Invalid symbol type " + symScope.sym.kind);
        }

    }

    visitIndexAccessExpression(expr: IndexAccessExpression, ctx: Context): string {
        let inferredType = expr.lhs.inferredType!.dereference();
        if (inferredType.is(ctx, ArrayType)) {
            let arrayType = inferredType.to(ctx, ArrayType) as ArrayType;

            if (expr.indexes.length != 1) {
                throw new Error("Invalid index access expression, expected 1 index got " + expr.indexes.length);
            }

            // make sure the index is an integer
            if (!expr.indexes[0].inferredType!.is(ctx, BasicType)) {
                throw new Error("Invalid index access expression, expected integer index got " + expr.indexes[0].inferredType?.toString());
            }
            else {
                let indexType = expr.indexes[0].inferredType!.to(ctx, BasicType) as BasicType;
                if (indexType.kind != "u8" && indexType.kind != "u16" && indexType.kind != "u32" && indexType.kind != "u64") {
                    throw new Error("Invalid index access expression, expected unsigned integer index got " + expr.indexes[0].inferredType?.toString());
                }
            }


            let indexReg = this.visitExpression(expr.indexes[0], ctx);

            // generate the array
            let reg = this.visitExpression(expr.lhs, ctx);

            this.i("debug", "array index access");
            let instr = arrayGetIndexType(ctx, arrayType.arrayOf.dereference());
            let tmp = this.generateTmp();
            this.i(instr, tmp, indexReg, reg);
            this.destroyTmp(reg);
            this.destroyTmp(indexReg);

            return tmp;
        }

        if (!expr.operatorOverloadState.isMethodCall) {
            throw new Error("Invalid index access expression, expected array or callable got " + expr.inferredType?.toString());
        }

        this.i("debug", "index access expression is an operator overload");

        // we simulate the call
        let methodCall = new FunctionCallExpression(
            expr.location,
            new MemberAccessExpression(
                expr.location,
                expr.lhs,
                new ElementExpression(
                    expr.location,
                    expr.operatorOverloadState.methodRef!.name)
            ),
            expr.indexes
        );

        methodCall.infer(ctx, expr.hintType);

        return this.visitFunctionCallExpression(methodCall, ctx);
    }

    visitIndexSetExpression(expr: IndexSetExpression, ctx: Context): string {
        let mainExprType = expr.lhs.inferredType!.dereference();
        if (mainExprType instanceof ArrayType) {
            this.i("debug", "array index set");
            this.i("debug", "array expression");
            let array_reg = this.visitExpression(expr.lhs, ctx);
            this.i("debug", "array index expression");
            let index_reg = this.visitExpression(expr.indexes[0], ctx);
            this.i("debug", "array value expression");
            let value_reg = this.visitExpression(expr.value, ctx);

            let instr = arraySetIndexType(ctx, mainExprType.arrayOf);
            this.i(instr, array_reg, index_reg, value_reg);
            this.destroyTmp(array_reg);
            this.destroyTmp(index_reg);
            this.destroyTmp(value_reg);
            return value_reg;
        }

        /**
         * indexset expression on a class is a method call
         */

        this.i("debug", "replacing index set expression with method call");

        if (!expr.operatorOverloadState.isMethodCall) {
            throw ctx.parser.customError("Invalid index set expression, expected method call", expr.location);
        }

        let methodCall = new FunctionCallExpression(
            expr.location,
            new MemberAccessExpression(expr.location, expr.lhs, new ElementExpression(expr.location, expr.operatorOverloadState.methodRef!.name)), [expr.value, ...expr.indexes]
        );

        methodCall.infer(ctx, expr.hintType);

        return this.visitFunctionCallExpression(methodCall, ctx);
    }

    visitMatchExpression(expr: MatchExpression, ctx: Context): string {
        throw new Error("Method not implemented.");
    }

    visitSpawnExpression(expr: SpawnExpression, ctx: Context): string {
        throw new Error("Method not implemented.");
    }

    visitUnnamedStructConstructionExpression(expr: UnnamedStructConstructionExpression, ctx: Context): string {
        /**
         * s_alloc [dest] [num_fields] [struct_size]
         * s_set_offset [dest] [field_index] [offset]
         * a_set_field_[type] [dest] [field_index] [value
         */

        let structType = expr.inferredType as StructType;
        let tmp = this.generateTmp();
        let structSize = structType.getStructSize(ctx);
        this.i("debug", "anonymous struct construction expression ");
        this.i("s_alloc", tmp, structType.fields.length, structSize);

        let offsetCounter = 0
        this.i("debug", "anonymous struct field offset");
        for (let i = 0; i < structType.fields.length; i++) {
            let field = structType.fields[i];
            this.i("s_set_offset", tmp, i, offsetCounter);
            offsetCounter += getDataTypeByteSize(field.type);
        }

        this.i("debug", "anonymous struct field values");

        for (let i = 0; i < structType.fields.length; i++) {
            let field = structType.fields[i];

            let res = this.visitExpression(expr.elements[i], ctx);

            let inst = structSetFieldType(ctx, field.type);
            this.i(inst, tmp, i, res);
            this.destroyTmp(res);
        }

        return tmp;
    }

    visitAwaitExpression(expr: AwaitExpression, ctx: Context): string {
        throw new Error("Method not implemented.");
    }

    visitInstanceCheckExpression(expr: InstanceCheckExpression, ctx: Context): string {
        let reg = this.visitExpression(expr.expression, ctx);
        let actualType = expr.expression.inferredType!.dereference();
        let castType = expr.type.dereference();

        if (actualType instanceof ClassType) {
            // castType has to be an interface
            // WRONG: ~if this test has passed, it means that the class implements the interface~ 
            // or is compatible with the interface

            //// this can be generated by pattern matching too, making the last point in valid
            // hence we need to check
            if (!(castType.is(ctx, InterfaceType))) {
                throw new Error("Expected interface type, got " + castType.kind);
            }

            // simply return the result 
            this.destroyTmp(reg);
            let tmp = this.generateTmp();
            //let castable = actualType.canCast(castType, ctx).success;
            let castable = canCastTypes(ctx, actualType, castType).success;
            this.i("debug", "Class -> Interface Check")
            this.i("const_u8", tmp, castable ? 1 : 0);

            return tmp;
        }

        if (actualType.is(ctx, InterfaceType)) {
            var actualTypeInterface = actualType.to(ctx, InterfaceType) as InterfaceType;

            if (castType instanceof ClassType) {
                let tmp = this.generateTmp();
                this.i("debug", "Instance -> Class Check")
                this.i("i_is_c", tmp, reg, castType.classId);
                this.destroyTmp(reg);
                return tmp;
            }
            else {
                // castType has to be an interface
                if (!(castType.is(ctx, InterfaceType))) {
                    throw new Error("Expected interface type, got " + castType.shortname());
                }

                let castTypeInterface = castType.to(ctx, InterfaceType) as InterfaceType;

                // check if they align
                if (actualTypeInterface.interfacesAlign(castTypeInterface)) {
                    this.destroyTmp(reg);
                    // simply return true
                    let tmp = this.generateTmp();
                    this.i("const_u8", tmp, 1);
                    return tmp;
                }
                else {
                    let failLabel = this.generateLabel();
                    let endLabel = this.generateLabel();

                    let tmp = this.generateTmp();
                    this.i("debug", "Interface -> Interface Check")
                    for (let i = 0; i < castTypeInterface.methods.length; i++) {
                        this.i("i_is_i", castTypeInterface.methods[i].getUID(), reg, failLabel);
                    }
                    this.destroyTmp(reg);
                    this.i("const_u8", tmp, 1);
                    this.i("j", endLabel);
                    this.i("label", failLabel);
                    this.i("const_u8", tmp, 0);
                    this.i("label", endLabel);

                    this.destroyTmp(reg);
                    return tmp;
                }

            }
        }
        if (actualType instanceof VariantType) {
            // variants are structs with a tag under the hood.
            if (castType instanceof VariantType) {
                throw new Error("Variant -> Variant checks are not yet implemented");
            }

            if (castType instanceof VariantConstructorType) {
                let name = castType.name;
                let constructor = actualType.getConstructor(name);
                if (constructor == null) {
                    throw new Error("Unknown constructor " + name);
                }

                let id_reg = this.generateTmp();
                this.i("debug", `Variant -> VariantConstructor "${name}" Check`)
                // offset 0 is the tag
                this.i("s_get_field_u16", id_reg, reg, 0)
                //this.i("debug_reg", id_reg)
                this.destroyTmp(reg);

                let tmp2 = this.generateTmp();

                let lblFalse = this.generateLabel();
                let lblEnd = this.generateLabel();

                this.i("const_u16", tmp2, constructor.getId());
                this.i("j_cmp_u16", id_reg, tmp2, 1, lblFalse);
                this.destroyTmp(id_reg);
                this.destroyTmp(tmp2);


                let res_reg = this.generateTmp();

                // here is true
                this.i("const_u8", res_reg, 1);
                this.i("j", lblEnd);
                // here is false
                this.i("label", lblFalse);
                this.i("const_u8", res_reg, 0);
                this.i("label", lblEnd);

                return res_reg;
            }
        }

        throw new Error(`Instance check expressions on ${actualType.kind} are not yet implemented`);
    }

    visitMemberAccessExpression(expr: MemberAccessExpression, ctx: Context): string {
        // first check if it a datatype access
        // datatype access: expr.lhs is element expression
        if (expr.left instanceof ElementExpression) {
            let elementName = expr.left.name;

            let sym = ctx.lookup(elementName);

            if (sym instanceof DeclaredType) {
                // case 1: Enum
                if (sym.type instanceof EnumType) {
                    // make sure expr.rhs is an element expression
                    if (!(expr.right instanceof ElementExpression)) {
                        throw ctx.parser.customError("Expected enum member name after `.`", expr.location);
                    }
                    let field = expr.right.name
                    this.i("debug", `enum member access expression: ${elementName}.${field}`);

                    let tmp = this.generateTmp();
                    let value = sym.type.getFieldValue(ctx, field);

                    if (sym.type.as == "unset") {
                        throw new Error("Enum type is unresolved");
                    }

                    let inst = constType(ctx, new BasicType(sym.location, sym.type.as));
                    this.i(inst, tmp, value);

                    return tmp;
                }

                // case 2: Variant
                // case 3: Interface static method
                // case 4: Class static method 
            }
        }



        let lhsReg = this.visitExpression(expr.left, ctx);
        let rhs = expr.right as ElementExpression;

        let baseType = expr.left.inferredType?.dereference();

        if (baseType instanceof ArrayType) {
            // an array can have two types of members: length and extend
            if (rhs.name == "length") {
                let tmp = this.generateTmp();
                this.i("debug", "array length expression");
                this.i("a_len", tmp, lhsReg);
                this.destroyTmp(lhsReg);
                return tmp;
            }
            else if (rhs.name == "extend") {
                throw new Error("Shouldn't be here");
            }
            else {
                throw new Error("Unknown array member " + rhs.name);
            }
        }

        if (baseType instanceof StructType) {
            let structType = baseType as StructType;
            let fieldType = structType.getFieldTypeByName(rhs.name);
            let fieldIndex = structType.getFieldIndex(rhs.name);

            let tmp = this.generateTmp();
            let instr = structGetFieldType(ctx, fieldType!);

            this.i(instr, tmp, lhsReg, fieldIndex);
            this.destroyTmp(lhsReg);

            return tmp;
        }
        else if (baseType instanceof ClassType) {
            // find if the field is an attribute or a method
            let classType = baseType as ClassType;
            let attr = classType.getAttribute(rhs.name);
            if (attr != null) {
                let instr = classGetFieldType(ctx, attr.type);
                let tmp = this.generateTmp();
                let fieldOffset = classType.getAttributeOffset(ctx, rhs.name)!;
                this.i(instr, tmp, lhsReg, fieldOffset);
                this.destroyTmp(lhsReg);
                return tmp;
            }
            else {
                throw new Error("Unknown class member " + rhs.name);
            }
        }

        else if (baseType instanceof VariantConstructorType) {
            // variant constructor
            this.i("debug", `variant constructor parameter access ${rhs.name}`);
            let variantType = baseType as VariantConstructorType;
            let parameterIndex = variantType.getParameterIndex(rhs.name);
            if (parameterIndex == -1) {
                throw new Error("Unknown parameter " + rhs.name);
            }

            let parameterType = variantType.getParameterType(parameterIndex);


            let tmp = this.generateTmp();
            let instr = structGetFieldType(ctx, parameterType);
            this.i(instr, tmp, lhsReg, parameterIndex);
            this.destroyTmp(lhsReg);
            return tmp;
        }

        throw new Error("Member access expressions for non-structs are not yet implemented");
    }

    visitThisExpression(expr: ThisExpression, ctx: Context): string {
        let tmp = this.generateTmp();
        this.i("debug", "this expression");
        this.i("tmp_ptr", tmp, "arg", this.fn.codeGenProps._this!.uid);
        return tmp;
    }

    visitBinaryExpression(expr: BinaryExpression, ctx: Context): string {

        if (expr.operatorOverloadState.isMethodCall) {
            // method call is as follows:
            // a + b -> a.add(b)
            this.i("debug", "replacing binary expression with method call");
            let methodCall = new FunctionCallExpression(
                expr.location,
                new MemberAccessExpression(expr.location, expr.left, new ElementExpression(expr.location, expr.operatorOverloadState.methodRef!.name)), [expr.right]
            );
            methodCall.infer(ctx, expr.inferredType)
            return this.visitFunctionCallExpression(methodCall, ctx);
        }


        // add debug info
        this.i("debug", "binary expression " + expr.operator);

        if (expr.operator == "=") {
            // generate the right expression
            let right = this.visitExpression(expr.right, ctx);

            if (isLocalVariable(expr.left, ctx)) {
                this.i("debug", "local variable assignment");
                let sym = ctx.lookup((expr.left as ElementExpression).name);
                // local variable
                if (this.isGlobal) {
                    let inst = globalType(ctx, expr.left.inferredType!);
                    this.i(inst, sym!.uid, right);
                }
                else {
                    let inst = tmpType(ctx, expr.left.inferredType!);
                    let tmp = this.generateTmp();
                    this.i(inst, tmp, "local", sym!.uid);
                    this.i(inst, tmp, "reg", right);
                }
                return right;
            }
            if (isGlobalVariable(expr.left, ctx)) {
                this.i("debug", "global variable assignment");
                let sym = ctx.lookup((expr.left as ElementExpression).name);
                // global variable
                let inst = globalType(ctx, expr.left.inferredType!);
                this.i(inst, sym!.uid, right);
                return right;
            }
            if (isFunctionArgument(expr.left, ctx)) {
                // arguments needs to be handled differently
                // arg_u32 x tmp_0 needs to be become:
                // 1. tmp_u32 tmp_1, x
                // 2. tmp_u32 tmp_2, "tmp", tmp_0

                this.i("debug", "function argument assignment");
                let sym = ctx.lookup((expr.left as ElementExpression).name);
                // function argument
                let inst = tmpType(ctx, expr.left.inferredType!);
                let tmp = this.generateTmp();
                this.i(inst, tmp, "arg", sym!.uid);
                this.i(inst, tmp, "reg", right);


                //this.i(inst, sym!.uid, right);
                return right;
            }
            if (expr.left instanceof MemberAccessExpression) {
                // check if it is struct
                let left = expr.left as MemberAccessExpression;
                let element = left.right as ElementExpression;

                let baseType = left.left.inferredType?.dereference();

                if (baseType instanceof StructType) {
                    let structType = baseType as StructType;
                    // we will assign the value to the struct's field
                    this.i("debug", "struct field assignment, struct expression");
                    let structExpr = this.visitExpression(left.left, ctx);
                    this.i("debug", "struct field assignment, struct member " + element.name);

                    let fieldType = structType.getFieldTypeByName(element.name)!;
                    let fieldIndex = structType.getFieldIndex(element.name)!;

                    let instr = structSetFieldType(ctx, fieldType);
                    this.i(instr, structExpr, fieldIndex, right);
                    this.destroyTmp(structExpr);
                    //this.i("s_set_field_f32", "struct field assignment, struct member");
                    return right
                }
                else if (baseType instanceof ClassType) {
                    let classType = baseType as ClassType;
                    // we will assign the value to the class's field
                    this.i("debug", "class field assignment, class expression");
                    let classExpr = this.visitExpression(left.left, ctx);
                    this.i("debug", "class field assignment, class member " + element.name);
                    let attr = classType.getAttribute(element.name);

                    if (attr == null) {
                        throw ctx.parser.customError("Can only assign to class attributes", element.location);
                    }

                    let fieldType = attr.type;
                    let fieldOffset = classType.getAttributeOffset(ctx, element.name)!;

                    let instr = classSetFieldType(ctx, fieldType);
                    this.i(instr, classExpr, fieldOffset, right);
                    this.destroyTmp(classExpr);

                    return right
                }
            }
            {
                this.i("debug", "assignment of " + expr.left.kind);
                throw new Error("Assignment to " + expr.left.kind + " is not yet implemented");
            }
        }
        else if (["+=", "-=", "*=", "/=", "%="].includes(expr.operator)) {
            // before transforing the expression, into separate binary expression and assignment, we check if it is += applied to a struct
            //
            //if((expr.operator === "+=") && (expr.metadata.isStructFieldUpdate === true)){
            //    throw ctx.parser.customError("Struct assignment is not yet implemented", expr.location);
            /**
        //     * TODO: go through the fields of rhs, and add them to the lhs
        //     */
            //}

            // generate the instruction
            let newInstruction = this.buildOpAssignBinaryExpr(ctx, expr.left, expr.right, (expr.operator as string)[0] as BinaryExpressionOperator, expr.inferredType!);
            return this.visitExpression(newInstruction, ctx);
        }


        if (!(expr.inferredType instanceof BasicType) && !(expr.inferredType instanceof BooleanType)) {
            throw ctx.parser.customError("Binary operation " + expr.operator + " is not yet implemented for " + expr.inferredType?.shortname(), expr.location);
        }


        // generate the left expression
        this.i("debug", "lhs of binary expression " + expr.operator);
        let left = this.visitExpression(expr.left, ctx);

        // generate the right expression
        this.i("debug", "rhs of binary expression " + expr.operator);
        let right = this.visitExpression(expr.right, ctx);

        if (expr.operator == "==" || expr.operator == "!=" || expr.operator == "<" || expr.operator == ">" || expr.operator == "<=" || expr.operator == ">=") {
            this.i("debug", "generating comparaison expression " + expr.operator);
            // result will be either 0 or 1
            let tmp = this.generateTmp();
            // first we cmp
            let inferredType = expr.left.inferredType?.dereference();
            let cmp: IRInstructionType = "j_cmp_u8";
            if ((inferredType instanceof BasicType) || (inferredType instanceof EnumType)) {
                let basic_type = inferredType as BasicType;
                if (inferredType instanceof EnumType) {
                    basic_type = inferredType.toBasicType(ctx);
                }
                cmp = getBinaryInstruction(basic_type, expr.operator);
            }
            else {
                // make sure that the operator is == or !=
                if ((expr.operator != "==") && (expr.operator != "!=")) {
                    throw ctx.parser.customError("Cannot compare " + expr.left.inferredType?.kind + " with " + expr.right.inferredType?.kind, expr.location);
                }

                cmp = "j_cmp_ptr"
            }


            // now we need three labels for the jumps
            // true label
            let lblTrue = this.generateLabel();
            // false label
            let lblFalse = this.generateLabel();
            // end label, if true, it needs to skip the false label
            let lblEnd = this.generateLabel();

            // if the condition is true, jump to the true label
            this.i("debug", "conditional jump");

            if (expr.operator == "==") {
                this.i(cmp, left, right, 0, lblTrue);
                this.i("j", lblFalse);
            }
            else if (expr.operator == "!=") {
                this.i(cmp, left, right, 1, lblTrue);
                this.i("j", lblFalse);
            }
            else if (expr.operator == "<") {
                this.i(cmp, left, right, 4, lblTrue);
                this.i("j", lblFalse);
            }
            else if (expr.operator == ">") {
                this.i(cmp, left, right, 2, lblTrue);
                this.i("j", lblFalse);
            }
            else if (expr.operator == "<=") {
                this.i(cmp, left, right, 5, lblTrue);
                this.i("j", lblFalse);
            }
            else if (expr.operator == ">=") {
                this.i(cmp, left, right, 3, lblTrue);
                this.i("j", lblFalse);
            }
            else {
                throw new Error("Unknown operator " + expr.operator);
            }

            this.destroyTmp(left);
            this.destroyTmp(right);

            // true label
            this.i("debug", "true label");
            this.i("label", lblTrue);
            this.i("const_u8", tmp, 1);
            // jump to the end
            this.i("debug", "true label jump");
            this.i("j", lblEnd);

            // false label
            this.i("debug", "false label");
            this.i("label", lblFalse);
            this.i("const_u8", tmp, 0);

            // no need to jump to the end, it will continue

            // end label
            this.i("debug", "end label");
            this.i("label", lblEnd);
            return tmp;
        }

        else {
            let inst = getBinaryInstruction(expr.left.inferredType as BasicType, expr.operator);
            let tmp = this.generateTmp();
            this.i(inst, tmp, left, right);
            this.destroyTmp(left);
            this.destroyTmp(right);
            return tmp;
        }
    }

    visitFunctionCallExpression(expr: FunctionCallExpression, ctx: Context): string {

        this.i("debug", "Function call expression");
        let lhsType = expr.lhs.inferredType!;

        // case 1: direct function call
        if ((lhsType instanceof FunctionType) && (expr.lhs instanceof ElementExpression)) {
            let sym = ctx.lookup(expr.lhs.name);

            let instructions: IRInstructionType[] = [];
            let regs: string[] = [];

            // generate the arguments, backwards
            for (let i = 0; i < expr.args.length; i++) {
                let arg = expr.args[i];
                let tmp = this.visitExpression(arg, ctx);
                let pushArgInst = fnSetArgType(ctx, arg.inferredType!);

                instructions.push(pushArgInst);
                regs.push(tmp);
            }

            this.i("fn_alloc")
            for (let i = 0; i < instructions.length; i++) {
                this.i(instructions[i], i, regs[i]);
                this.destroyTmp(regs[i]);
            }

            if (sym instanceof DeclaredFunction) {
                let decl = fetchElementSymbol(ctx, expr.lhs) as DeclaredFunction;

                let jumpId = decl.context.uuid;

                // check if the function returns a value
                let hasReturn = true;
                if ((expr.inferredType instanceof VoidType)) {
                    hasReturn = false;
                }

                if (hasReturn) {
                    let tmp = this.generateTmp();
                    this.i("call", tmp, jumpId);
                    return tmp;
                }
                else {
                    this.i("call", jumpId);
                    return "";
                }
            }
            else {
                let reg = this.visitExpression(expr.lhs, ctx);
                // check if the function returns a value
                let hasReturn = true;
                if ((expr.inferredType instanceof VoidType)) {
                    hasReturn = false;
                }

                if (hasReturn) {
                    let tmp = this.generateTmp();
                    this.i("call_ptr", tmp, reg);
                    this.destroyTmp(reg);
                    return tmp;
                }
                else {
                    this.i("call_ptr", reg);
                    this.destroyTmp(reg);
                    return "";
                }
            }
        }

        // case 2: method/class method class x.f()
        else if ((lhsType instanceof FunctionType) && (expr.lhs instanceof MemberAccessExpression)) {
            // make sure it is a class method
            let baseExpression = expr.lhs as MemberAccessExpression;
            let baseType = baseExpression.left.inferredType?.dereference();
            if (baseType instanceof ClassType) {
                let classType = baseType as ClassType;
                classType.buildAllMethods();

                let baseClass = baseExpression.left;
                let accessElement = (baseExpression.right as ElementExpression).name;

                // nowe we have to guess if it is a method or an attribute
                let attr = classType.getAttribute(accessElement);

                if (attr != null) {
                    this.i("debug", `class attribute call ${accessElement}`);
                    // it is an attribute, we get the proceed normally
                    let reg = this.visitExpression(expr.lhs, ctx);


                    let instructions: IRInstructionType[] = [];
                    let regs: string[] = [];

                    // generate the arguments, backwards
                    for (let i = 0; i < expr.args.length; i++) {
                        let arg = expr.args[i];
                        let tmp = this.visitExpression(arg, ctx);
                        let pushArgInst = fnSetArgType(ctx, arg.inferredType!);
                        instructions.push(pushArgInst);
                        regs.push(tmp);
                    }

                    this.i("fn_alloc")

                    for (let i = 0; i < instructions.length; i++) {
                        this.i(instructions[i], i, regs[i]);
                        this.destroyTmp(regs[i]);
                    }

                    let hasReturn = true;
                    if ((expr.inferredType instanceof VoidType)) {
                        hasReturn = false;
                    }

                    if (hasReturn) {
                        let tmp = this.generateTmp();
                        this.i("call_ptr", tmp, reg);
                        this.destroyTmp(reg);
                        return tmp;
                    }
                    else {
                        this.i("call_ptr", reg);
                        this.destroyTmp(reg);
                        return "";
                    }
                }
                else {
                    // gotta be a method
                    // check if it is static or not

                    let typeArgs = (expr.lhs.right as ElementExpression).typeArguments;
                    let methodIndex = 0;


                    let class_pointer_reg = this.visitExpression(baseClass, ctx);

                    // now generate the instruction to get the method
                    let methodReg = this.generateTmp();

                    let method: InterfaceMethod | null = null;

                    // make sure the cached method is not null
                    if (expr._calledClassMethod == null) {
                        throw new Error("Method not found in cache");
                    }
                    // if the method is generic, we need to use the concrete method
                    method = expr._calledClassMethod!.imethod;
                    methodIndex = expr._calledClassMethod!.indexInClass!;


                    let isStatic = method?.isStatic;
                    if (method == null) {
                        throw ctx.parser.customError("Unknown method " + accessElement, lhsType.location);
                    }

                    this.i("debug", `class method call ${method.name}`);
                    this.i("c_load_m", methodReg, class_pointer_reg, methodIndex);



                    let instructions: IRInstructionType[] = [];
                    let regs: string[] = [];

                    // generate the arguments, backwards
                    for (let i = 0; i < expr.args.length; i++) {
                        let arg = expr.args[i];
                        let tmp = this.visitExpression(arg, ctx);
                        let pushArgInst = fnSetArgType(ctx, arg.inferredType!);
                        instructions.push(pushArgInst);
                        regs.push(tmp);
                    }

                    this.i("fn_alloc")

                    if (!isStatic) {
                        // push the base object into the stack as parameter
                        this.i("fn_set_reg_ptr", 0, class_pointer_reg);
                    }

                    this.destroyTmp(class_pointer_reg);

                    for (let i = 0; i < instructions.length; i++) {
                        this.i(instructions[i], i + (isStatic ? 0 : 1), regs[i]);
                        this.destroyTmp(regs[i]);
                    }

                    let hasReturn = true;
                    if ((expr.inferredType?.dereference() instanceof VoidType)) {
                        hasReturn = false;
                    }

                    if (hasReturn) {
                        let tmp = this.generateTmp();
                        this.i("call_ptr", tmp, methodReg);
                        this.destroyTmp(methodReg);
                        return tmp;
                    }
                    else {
                        this.i("call_ptr", methodReg);
                        this.destroyTmp(methodReg);
                        return "";
                    }

                }

            }
            else if (baseType instanceof InterfaceType) {
                let accessElement = (expr.lhs.right as ElementExpression).name;
                // interface, must be a method
                this.i("debug", "interface method call");
                let interfaceType = baseType as InterfaceType;

                if (expr._calledInterfaceMethod == null) {
                    throw new Error("Method not found in cache");
                }

                let method = expr._calledInterfaceMethod;
                let methodIndex = expr._calledInterfaceMethod!._indexInInterface;


                let isStatic = method?.isStatic;

                this.i("debug", "interface expression");
                // now we need to get the interface pointer
                let interfacePointer = this.visitExpression(baseExpression.left, ctx);

                this.i("debug", "method address of " + method.name);
                // now we need to get the method
                let methodReg = this.generateTmp();

                this.i("i_load_m", methodReg, interfacePointer, methodIndex);

                this.i("debug", "set up args");

                let instructions: IRInstructionType[] = [];
                let regs: string[] = [];

                // generate the arguments, backwards
                for (let i = 0; i < expr.args.length; i++) {
                    let arg = expr.args[i];
                    let tmp = this.visitExpression(arg, ctx);
                    let pushArgInst = fnSetArgType(ctx, arg.inferredType!);
                    instructions.push(pushArgInst);
                    regs.push(tmp);
                }

                this.i("fn_alloc")

                if (!isStatic) {
                    // get class
                    let classReg = this.generateTmp();
                    this.i("i_get_c", classReg, interfacePointer);
                    // push the base object into the stack as parameter
                    this.i("fn_set_reg_ptr", 0, classReg);
                    this.destroyTmp(classReg);
                }
                this.destroyTmp(interfacePointer);

                for (let i = 0; i < instructions.length; i++) {
                    this.i(instructions[i], i + (isStatic ? 0 : 1), regs[i]);
                    this.destroyTmp(regs[i]);
                }

                let hasReturn = true;
                if ((expr.inferredType?.dereference() instanceof VoidType)) {
                    hasReturn = false;
                }

                if (hasReturn) {
                    let tmp = this.generateTmp();
                    this.i("call_ptr", tmp, methodReg);
                    this.destroyTmp(methodReg);
                    return tmp;
                }
                else {
                    this.i("call_ptr", methodReg);
                    this.destroyTmp(methodReg);
                    return "";
                }
            }
            else if (baseType instanceof ArrayType) {
                // check if array extend method
                if ((expr.lhs.right as ElementExpression).name == "extend") {

                    let arrayReg = this.visitExpression(baseExpression.left, ctx);
                    let new_size = this.visitExpression(expr.args[0], ctx);
                    this.i("a_extend", arrayReg, new_size);
                    this.destroyTmp(arrayReg);
                    this.destroyTmp(new_size);

                    return null as any as string;
                }
                else if ((expr.lhs.right as ElementExpression).name == "slice") {
                    let arrayReg = this.visitExpression(baseExpression.left, ctx);
                    let start = this.visitExpression(expr.args[0], ctx);
                    let end = this.visitExpression(expr.args[1], ctx);
                    let tmp = this.generateTmp();
                    this.i("a_slice", tmp, arrayReg, start, end);
                    this.destroyTmp(arrayReg);
                    this.destroyTmp(start);
                    this.destroyTmp(end);
                    return tmp;
                }
            }
            else if (baseType instanceof MetaType) {
                if (baseType instanceof MetaClassType) {
                    // Class static method call
                    let classType = baseType.classType as ClassType;
                    let method = expr._calledClassMethod;
                    if (method == null) {
                        throw ctx.parser.customError("Unknown method " + (expr.lhs.right as ElementExpression).name, lhsType.location);
                    }


                    let instructions: IRInstructionType[] = [];
                    let regs: string[] = [];

                    // generate the arguments, backwards
                    for (let i = 0; i < expr.args.length; i++) {
                        let arg = expr.args[i];
                        let tmp = this.visitExpression(arg, ctx);
                        let pushArgInst = fnSetArgType(ctx, arg.inferredType!);
                        instructions.push(pushArgInst);
                        regs.push(tmp);
                    }

                    this.i("fn_alloc")

                    for (let i = 0; i < instructions.length; i++) {
                        this.i(instructions[i], i, regs[i]);
                        this.destroyTmp(regs[i]);
                    }

                    let hasReturn = true;
                    if ((expr.inferredType instanceof VoidType)) {
                        hasReturn = false;
                    }

                    if (hasReturn) {
                        let tmp = this.generateTmp();
                        this.i("call", tmp, method.context.uuid);
                        return tmp;
                    }
                    else {
                        this.i("call", method.context.uuid);
                        return "";
                    }
                }
            }
        }
        // case 3: Method override of __call___ -> x(1, 2, 3) -> x.__call__(1, 2, 3)
        if (expr.operatorOverloadState.isMethodCall) {
            // we will have to generate a new function call expression
            this.i("debug", "replacing binary function call with method call");
            let methodCall = new FunctionCallExpression(
                expr.location,
                new MemberAccessExpression(expr.location, expr.lhs, new ElementExpression(expr.location, expr.operatorOverloadState.methodRef!.name)), expr.args
            );
            methodCall.infer(ctx, expr.inferredType)
            return this.visitFunctionCallExpression(methodCall, ctx);
        }
        // case 4: Variant Constructor
        if ((lhsType instanceof MetaType) && (lhsType instanceof MetaVariantConstructorType)) {
            // variant constructor

            // first we need to get the variant type
            let variantType = lhsType.variantConstructorType.dereference() as VariantConstructorType;

            // now we need to get the variant ID
            let variantID = variantType.getId();

            // evaluate the arguments
            let args = expr.args.map((x) => this.visitExpression(x, ctx))
            let argsOffset = [0];
            let variantSize = [2];
            variantType.parameters.forEach((param, i) => {
                let fsize = getDataTypeByteSize(param.type);
                variantSize.push(fsize);
                argsOffset.push(argsOffset[i] + variantSize[i]);
            })

            // allocate the variant
            let variantReg = this.generateTmp();
            this.i("debug", "allocating variant");
            this.i("s_alloc", variantReg, argsOffset.length, variantSize.reduce((a, b) => a + b, 0));
            for (let i = 0; i < argsOffset.length; i++) {
                if (i == 0) {
                    this.i("debug", `setting variant field offset tag`);
                }
                else {
                    this.i("debug", `setting variant field offset ${variantType.parameters[i - 1].name}`);
                }

                this.i("s_set_offset", variantReg, i, argsOffset[i]);
            }
            this.i("debug", `setting variant field tag`);
            let variantIdReg = this.generateTmp();
            this.i("const_u16", variantIdReg, variantID);
            this.i("s_set_field_u16", variantReg, 0, variantIdReg);
            this.destroyTmp(variantIdReg);
            for (let i = 0; i < args.length; i++) {
                this.i("debug", `setting variant field ${variantType.parameters[i].name}`);
                let instr = structSetFieldType(ctx, variantType.parameters[i].type);
                this.i(instr, variantReg, i + 1, args[i]);
                this.destroyTmp(args[i]);
            }

            return variantReg;
        }
        else if (lhsType instanceof FFIMethodType) {
            let baseFFI = lhsType.parentFFI!;
            let ffi_id = baseFFI.ffiId;
            let method_id = baseFFI.getMethodIndex(lhsType.imethod.name);

            let reg = this.generateTmp();
            this.i("ffi_get_method", reg, ffi_id, method_id);

            let instructions: IRInstructionType[] = [];
            let regs: string[] = [];


            // disallow spill
            // this.i("disallow_spill", 0)

            for (let i = expr.args.length - 1; i >= 0; i--) {
                let arg = expr.args[i];
                let tmp = this.visitExpression(arg, ctx);
                let pushArgInst = pushStackType(ctx, arg.inferredType!);
                instructions.push(pushArgInst);
                regs.push(tmp);
            }

            for (let i = 0; i < instructions.length; i++) {
                this.i(instructions[i], regs[i]);
                this.destroyTmp(regs[i]);
            }


            let hasReturn = true;
            if ((expr.inferredType instanceof VoidType)) {
                hasReturn = false;
            }


            if (hasReturn) {
                let tmp = this.generateTmp();
                this.i("call_ffi", reg);
                this.destroyTmp(reg);
                let pop = popStackType(ctx, expr.inferredType!);
                this.i(pop, tmp);
                return tmp;
            }
            else {
                this.i("call_ffi", reg);
                this.destroyTmp(reg);
                return "";
            }
            //this.i("allow_spill")
        }

        throw new Error("Non-direct function calls are not yet implemented");
    }

    visitLambdaExpression(expr: LambdaExpression, ctx: Context): string {
        // lambda expression simply means storing the function in a variable
        let lambdaReg = this.generateTmp();
        this.i("debug", "storing lambda in variable");
        this.i("const_ptr", lambdaReg, expr.context.uuid);
        return lambdaReg;
    }

    visitNamedStructConstructionExpression(expr: NamedStructConstructionExpression, ctx: Context): string {
        /**
         * s_alloc [dest] [num_fields] [struct_size]
         * s_set_offset [dest] [field_index] [offset]
         * a_set_field_[type] [dest] [field_index] [value
         */
        let structType = expr.inferredType as StructType;
        let tmp = this.generateTmp();
        let structSize = structType.getStructSize(ctx);
        this.i("debug", "named struct construction expression ");
        this.i("s_alloc", tmp, structType.fields.length, structSize);

        let offsetCounter = 0
        this.i("debug", "named struct field offset");
        for (let i = 0; i < structType.fields.length; i++) {
            let field = structType.fields[i];

            this.i("s_set_offset", tmp, i, offsetCounter);
            offsetCounter += getDataTypeByteSize(field.type)
        }

        this.i("debug", "named struct field values");

        for (let i = 0; i < structType.fields.length; i++) {
            let field = structType.fields[i];

            let res = this.visitExpression(expr.fields[i].value, ctx);

            let inst = structSetFieldType(ctx, field.type);
            this.i(inst, tmp, i, res);
            this.destroyTmp(res);
        }

        return tmp;
    }

    visitTupleConstructionExpression(expr: TupleConstructionExpression, ctx: Context): string {
        throw new Error("Method not implemented.");
    }

    visitTupleDeconstructionExpression(expr: TupleDeconstructionExpression, ctx: Context): string {
        throw new Error("Method not implemented.");
    }

    visitCastExpression(expr: CastExpression, ctx: Context, argReg?: string): string {
        let castReg = argReg || this.visitExpression(expr.expression, ctx);
        let inferredType = expr.expression.inferredType?.dereference();
        let hintType = expr.target.dereference();

        if (argReg == undefined) {
            this.i("debug", "Manual Casting");
        }
        else {
            this.i("debug", "Inference Casting Check");
        }

        if (expr.castType == "force") {
            this.i("debug", "force cast, nothing to do");
        }
        else if (expr.castType == "safe") {
            this.i("debug", "safe cast");
            /**
             * Safe casts yields a nullable.
             * Safe cast is done to cast an interface to a base class or an interface to another interface
             */
            let nonNullType = (hintType as NullableType).type.dereference();
            if ((nonNullType instanceof ClassType) && (inferredType instanceof InterfaceType)) {
                // we will have to check if the interface contains all the class methods
                // using: i_is_i interface_reg, method_uid, fail_jump_address

                // generate label to go to when check fails
                let jmpFail = this.generateLabel();

                // generate label to check to when everything is done
                let jmpEnd = this.generateLabel();

                let instanceCheckRes = this.generateTmp();
                this.i("i_is_c", instanceCheckRes, castReg, nonNullType.getClassID());

                let tmpZero = this.generateTmp();
                this.i("const_u8", tmpZero, 0);
                this.i("j_cmp_u8", instanceCheckRes, tmpZero, 1, jmpFail);

                this.destroyTmp(tmpZero);
                this.destroyTmp(instanceCheckRes);

                // if we reached this point, it means that the interface contains all the methods
                // we can now cast
                let tmp = this.generateTmp();
                this.i("i_get_c", tmp, castReg);
                this.destroyTmp(castReg);
                // now jump
                this.i("j", jmpEnd);

                // if we reached this point, it means that the interface does not contain all the methods
                // we will return null
                this.i("label", jmpFail);
                this.i("const_ptr", tmp, 0);
                this.i("j", jmpEnd);

                // end label
                this.i("label", jmpEnd);

                return tmp;
            }
            else if ((nonNullType instanceof InterfaceType) && (inferredType instanceof ClassType)) {
                // usually this happens when an interface is declared nullable and we want to assign a class to it
                // the type checker already checked that the class implements the interface, so we just 
                // check if the class is null, else we change this cast to a regular one
                let tmp = this.generateTmp();
                this.i("const_ptr", tmp, 0);
                let failLabel = this.generateLabel();
                let endLabel = this.generateLabel();
                this.i("j_cmp_ptr", castReg, tmp, 0, failLabel);
                this.destroyTmp(tmp);
                // if everything alright we cast normally
                let newCast = new CastExpression(expr.location, expr.expression, nonNullType, "regular")
                //newCast.infer(ctx, nonNullType);
                let casted = this.visitCastExpression(newCast, ctx, castReg);
                this.destroyTmp(castReg)
                this.i("j", endLabel);
                this.i("label", failLabel);
                this.i("const_ptr", casted, 0);
                this.i("label", endLabel);
                return casted;
            }
            else if ((nonNullType instanceof InterfaceType) && (inferredType instanceof NullableType)) {
                // called when we want to assign a nullable interface to a nullable interface
                // same as class, we check if the interface is null, else we change this cast to a regular one
                let tmp = this.generateTmp();
                this.i("const_ptr", tmp, 0);
                let failLabel = this.generateLabel();
                let endLabel = this.generateLabel();
                this.i("j_cmp_ptr", castReg, tmp, 0, failLabel);
                this.destroyTmp(tmp);
                // if everything alright we cast normally
                let newCast = new CastExpression(expr.location, expr.expression, nonNullType, "regular")
                expr.expression.inferredType = (expr.expression.inferredType as NullableType).type;

                //newCast.infer(ctx, nonNullType);
                let casted = this.visitCastExpression(newCast, ctx, castReg);
                this.destroyTmp(castReg)
                this.i("j", endLabel);
                this.i("label", failLabel);
                this.i("const_ptr", casted, 0);
                this.i("label", endLabel);
                return casted;
            }
            else if ((nonNullType instanceof InterfaceType) && (inferredType instanceof InterfaceType)) {
                // check if the interfaces align
                if (expr.isCastUnnecessary) {
                    // replace with regular cast
                    this.i("debug", "replacing unnecessary safe cast with regular cast");
                    return this.visitCastExpression(new CastExpression(expr.location, expr.expression, expr.target, "regular"), ctx, castReg);
                }

                // now we need to cast the interface to the other interface
                // we dont go through base class because it inherit it from the interface
                // using i_alloc_i
                //let baseClassReg = this.generateTmp();
                //this.i("i_get_c", baseClassReg, castReg);

                let newInterface = this.generateTmp();
                this.i("i_alloc_i", newInterface, nonNullType.getMethodsLength(), castReg);

                //this.destroyTmp(baseClassReg);
                this.destroyTmp(castReg);

                let failLabel = this.generateLabel();
                let endLabel = this.generateLabel();

                // now we need to set each method into the new interface
                for (let i = 0; i < nonNullType.methods.length; i++) {
                    let method = nonNullType.methods[i];
                    this.i("i_set_offset_m", newInterface, method.getUID(), i, failLabel);
                }

                // if we reached this point, it means that the interface does contain all the methods
                // we can now jump to end
                this.i("j", endLabel);
                this.i("label", failLabel);
                this.i("const_ptr", newInterface, 0);
                this.i("label", endLabel);
                return newInterface;
            }
            else if (inferredType instanceof NullableType) {
                // this happens when visitCast is called manually within visit expression
                // to safely assign a class to interface or interface to another
                inferredType = inferredType.type.dereference();

                let failureLabel = this.generateLabel();
                let endLabel = this.generateLabel();
                let tmp = this.generateTmp();
                this.i("const_ptr", tmp, 0);
                this.i("j_cmp_ptr", castReg, tmp, 0, failureLabel);
                this.destroyTmp(tmp);
                // if everything alright we cast normally
                let casted = this.visitCastExpression(new CastExpression(expr.location, expr, inferredType, "regular"), ctx, castReg);
                this.destroyTmp(castReg)
                this.i("j", endLabel);
                this.i("label", failureLabel);
                this.i("const_ptr", casted, 0);
                this.i("label", endLabel);
                return casted;
            }
        }

        this.i("debug", "regular cast");


        if ((inferredType instanceof BasicType) && (inferredType.kind != "null")) {
            let fromType = inferredType?.kind;
            let toType = hintType.kind;

            if (hintType instanceof EnumType) {
                toType = hintType.as;
            }

            if (toType == fromType) {
                return castReg;
            }
            // generate expresion
            let instructions = generateCastInstruction(fromType as unknown as CastType, toType as unknown as CastType, castReg);

            for (let instr of instructions) {
                let cmd = instr[0] as IRInstructionType;
                // remaining converted to array of number
                let args = instr.slice(1).map((x: string) => x);

                this.i(cmd, ...args);
            }
        }
        else if (inferredType instanceof StructType) {
            if ((hintType != undefined) && (hintType instanceof StructType)) {
                let destType = inferredType as StructType;
                let srcType = hintType as StructType;

                if (destType.fieldsAligned(srcType, ctx)) {
                    // we do nothing
                }
                else {
                    // we will have to generate a new struct with the fields in the right order
                    this.i("debug", "struct assignment with different field order");
                    let offsetDiff = destType.generateOffsetSwaps(srcType);
                    let tmpReg = this.generateTmp();
                    this.i("s_alloc_shadow", tmpReg, castReg, srcType.fields.length);
                    this.destroyTmp(castReg);
                    for (let i = 0; i < srcType.fields.length; i++) {
                        let offset = offsetDiff[i];

                        this.i("s_set_offset_shadow", tmpReg, i, offset);
                    }
                    castReg = tmpReg
                }
            }
        }

        else if (inferredType instanceof ClassType) {
            if (hintType instanceof InterfaceType) {
                this.i("debug", "Converted class to interface");
                let interfaceType = hintType as InterfaceType;
                let classType = inferredType as ClassType;

                let tmpReg = this.generateTmp();
                this.i("i_alloc", tmpReg, inferredType.getAllMethods().length, castReg);
                this.destroyTmp(castReg);
                let offsetTable = classType.getIndexesForInterfaceMethods(ctx, interfaceType);
                for (let i = 0; i < offsetTable.length; i++) {
                    this.i("i_set_offset", tmpReg, i, offsetTable[i]);
                }

                castReg = tmpReg;
            }
        }
        else if (inferredType instanceof InterfaceType) {
            if (hintType instanceof InterfaceType) {
                // check if they align
                if (!inferredType.interfacesAlign(hintType)) {
                    this.i("debug", "re-aligning interfaces");
                    let offsetSwaps = inferredType.generateOffsetSwaps(ctx, hintType);
                    let tmpReg = this.generateTmp();
                    this.i("i_alloc_i", tmpReg, inferredType.getMethodsLength(), castReg);
                    for (let i = 0; i < offsetSwaps.length; i++) {
                        this.i("i_set_offset_i", tmpReg, i, offsetSwaps[i], castReg);
                    }
                    this.destroyTmp(castReg);
                    castReg = tmpReg;
                }
            }
        }

        return castReg
    }

    visitIfElseExpression(expr: IfElseExpression, ctx: Context): string {
        this.i("debug", "if-else expression");
        // generate a tmp variable to hold the final result
        let tmpRes = this.generateTmp();
        let finalJump = this.generateLabel();


        // generate the conditions with jumps
        for (let [i, ifExpr] of expr.conditions.entries()) {
            this.i("debug", "if-else expression condition");
            let resTmp = this.visitExpression(ifExpr, ctx);
            // compare
            let t = this.generateTmp();
            this.i("const_u8", t, 0)
            this.i("debug", "if-else expression jump");
            this.i("j_cmp_u8", resTmp, t, 1, expr.conditionsUIDs[i]);
            this.destroyTmp(t);
            // generate the jump instruction
        }
        // generate the jump to else block 
        this.i("debug", "if-else else-expression jump");
        let elseUID = this.generateLabel();
        this.i("j", elseUID);

        // now we need to generate the bodies of the expression
        for (let [i, body] of expr.bodies.entries()) {
            // label
            this.i("debug", "if-else expression label");
            this.i("label", expr.conditionsUIDs[i]);
            this.i("debug", "if-else expression body");
            let reg = this.visitExpression(body, ctx);
            // store the result in the tmp variable
            this.i("debug", "if-else expression store result");
            let instruction = tmpType(ctx, expr.inferredType!);
            this.i(instruction, tmpRes, "reg", reg);
            this.destroyTmp(reg);
            // jump to the end
            this.i("debug", "if-else expression jump");
            this.i("j", finalJump);
        }

        // finally the else block
        // which do not need a label
        this.i("debug", "if-else else-expression label");
        this.i("label", elseUID);
        let reg = this.visitExpression(expr.elseBody, ctx);
        // store the result in the tmp variable
        this.i("debug", "if-else else-expression store result");
        let instruction = tmpType(ctx, expr.inferredType!);
        this.i(instruction, tmpRes, "reg", reg);
        this.destroyTmp(reg);

        // now the end label
        this.i("debug", "if-else expression end label");
        this.i("label", finalJump);

        return tmpRes;
    }

    visitLetInExpression(expr: LetInExpression, ctx: Context): string {
        this.i("debug", "let-in expression: " + expr.variables.map(v => v.name).join(", "));
        // generate the variables
        for (let decl of expr.variables) {

            /*
            let tmp = this.visitExpression(decl.initializer, ctx);
            let inst = (this.isGlobal?globalType:localType)(ctx, decl.annotation!);
            this.i(inst, decl.uid, tmp); // local_[type] = tmp
            this.emitDestroy(tmp);
            */

            let left: Expression = new ElementExpression(decl.location, decl.name);
            let right = decl.initializer;
            let assign = new BinaryExpression(decl.location, left, right, "=");
            assign.infer(ctx, decl.annotation);
            let resTmp = this.visitExpression(assign, ctx);
            this.destroyTmp(resTmp);
        }

        // generate the body
        let res = this.visitExpression(expr.inExpression, expr.context);
        return res;
    }

    visitNewExpression(expr: NewExpression, ctx: Context): string {
        let baseType = expr.inferredType?.dereference();
        // base type could be a class or a process
        if (baseType instanceof ClassType) {

            // allocate the class
            let classType = baseType as ClassType;
            let tmp = this.generateTmp();
            let num_attrs = classType.attributes.length;
            let size_attrs = classType.getAttributesBlockSize();
            let classMethods = classType.getAllMethods()
            let num_methods = classMethods.length;

            this.i("debug", `class allocation\nnum methods: ${num_methods} \ndata size: ${size_attrs}`);
            this.i("c_alloc", tmp, num_methods, size_attrs, classType.getClassID());

            // initialize the methods
            for (let i = 0; i < classMethods.length; i++) {
                let method = classMethods[i];
                this.i("debug", `setting class method ${i}:${method.imethod.name}`);
                this.i("c_store_m", tmp, i, method.context.uuid);
            }

            // last call the constructor
            let constructor = expr._calledInitMethod;
            if (constructor != null) {
                let constructorIndex = constructor._sourceMethod?.indexInClass ?? -1;

                if (constructorIndex == -1) {
                    throw new Error("Constructor not found in class");
                }

                this.i("debug", "class allocation, calling constructor");

                let instructions: IRInstructionType[] = [];
                let regs: string[] = [];

                this.i("debug", "class allocation, calling constructor");
                let tmp_constructor = this.generateTmp();
                this.i("c_load_m", tmp_constructor, tmp, constructorIndex);

                // generate the arguments, backwards
                for (let i = 0; i < expr.arguments.length; i++) {
                    let arg = expr.arguments[i];
                    let tmp = this.visitExpression(arg, ctx);
                    let pushArgInst = fnSetArgType(ctx, arg.inferredType!);
                    instructions.push(pushArgInst);
                    regs.push(tmp);
                }

                this.i("fn_alloc")
                this.i("fn_set_reg_ptr", 0, tmp);

                for (let i = 0; i < instructions.length; i++) {
                    this.i(instructions[i], i + 1, regs[i]);
                    this.destroyTmp(regs[i]);
                }


                // now call


                this.i("call_ptr", tmp_constructor);
                this.destroyTmp(tmp_constructor);
            }
            else {
                // no constructor, we do nothing
                this.i("debug", "class allocation, no constructor");
            }
            return tmp;
        }
        else {
            throw new Error("Invalid new expression, expected class got " + baseType?.toString());
        }
    }

    visitCoroutineConstructionExpression(expr: CoroutineConstructionExpression, ctx: Context): string {
        throw new Error("Method not implemented.");
    }

    visitLiteralExpression(expr: LiteralExpression, ctx: Context): string {
        let tmp = this.generateTmp();
        let tmpIndexReg = this.generateTmp();
        let c = constType(ctx, expr.inferredType!);


        if (expr instanceof StringLiteralExpression) {
            /* 
             * We generate the code as follows: 
             * 1. generate bytes string
             * 2. Call default string.fromBuffer(bytes) method
             * 3. Destroy bytes string
             * 4. return the result of the method call
             */
            let exprBin = new BinaryStringLiteralExpression(expr.location, expr.value);
            let fromBytes = new FunctionCallExpression(expr.location,
                new MemberAccessExpression(expr.location, new ElementExpression(expr.location, "String"), new ElementExpression(expr.location, "fromBytes")),
                [exprBin]
            )

            fromBytes.infer(ctx, expr.inferredType);
            let res = this.visitFunctionCallExpression(fromBytes, ctx);
            //expr.inferredType = fromBytes.inferredType;
            return res;
        }
        else if (expr instanceof BinaryStringLiteralExpression) {
            this.i("const_str", tmp, tmpIndexReg, expr.value);
            this.destroyTmp(tmpIndexReg);
        }
        else if (expr instanceof HexIntLiteralExpression)
            // convert hex to number
            this.i(c, tmp, parseInt(expr.value, 16) + "");
        else if (expr instanceof IntLiteralExpression)
            this.i(c, tmp, expr.value);
        else if (expr instanceof CharLiteralExpression)
            this.i(c, tmp, expr.value);
        else if (expr instanceof TrueLiteralExpression)
            this.i(c, tmp, 1);
        else if (expr instanceof FalseLiteralExpression)
            this.i(c, tmp, 0);
        else if (expr instanceof FloatLiteralExpression)
            this.i(c, tmp, expr.value);
        else if (expr instanceof DoubleLiteralExpression)
            this.i(c, tmp, expr.value);
        else if (expr instanceof NullLiteralExpression)
            this.i(c, tmp, 0);

        else
            throw new Error("Unknown literal type " + expr.literalKind);


        return tmp;

    }

    visitNullableMemberAccessExpression(expr: NullableMemberAccessExpression, ctx: Context): string {
        throw new Error("Method not implemented.");
    }

    visitUnaryExpression(expr: UnaryExpression, ctx: Context): string {

        // case 1: operator overload
        if (expr.operatorOverloadState.isMethodCall) {
            let methodCall = new FunctionCallExpression(
                expr.location,
                new MemberAccessExpression(expr.location, expr.expression, new ElementExpression(expr.location, expr.operatorOverloadState.methodRef!.name)), []
            );

            methodCall.infer(ctx, expr.inferredType);
            return this.visitFunctionCallExpression(methodCall, ctx);
        }

        // case 2: denull operator, has no impact on IR
        if (expr.operator == "!!") {
            let uhsReg = this.visitExpression(expr.expression, ctx);
            return uhsReg;
        }

        // case 3: math/logical operators
        if (expr.operator == "-") {
            let uhsReg = this.visitExpression(expr.expression, ctx);
            let lhsType = expr.expression.inferredType!;
            let zeroTmp = this.generateTmp();
            let resTmp = this.generateTmp();
            this.i("debug", "unary minus expression, replacing with subtraction with 0");
            this.i(constType(ctx, lhsType), zeroTmp, 0);
            this.i(getUnaryInstruction(expr.inferredType as BasicType, "-"), resTmp, zeroTmp, uhsReg);
            this.destroyTmp(uhsReg);
            this.destroyTmp(zeroTmp);
            return resTmp;
        }

        if (["!", "~"].includes(expr.operator)) {
            let uhsReg = this.visitExpression(expr.expression, ctx);
            let resTmp = this.generateTmp();
            this.i(getUnaryInstruction(expr.inferredType as BasicType, expr.operator), resTmp, uhsReg);
            this.destroyTmp(uhsReg);
            return resTmp;
        }

        if ((expr.operator == "pre++") || (expr.operator == "pre--")) {
            // transfer to addition
            let one = new IntLiteralExpression(expr.location, "1");

            let assignExpr = this.buildOpAssignBinaryExpr(ctx, expr.expression, one, expr.operator == "pre++" ? "+" : "-", expr.inferredType!);

            return this.visitExpression(assignExpr, ctx);
        }

        if ((expr.operator == "post++") || (expr.operator == "post--")) {
            throw new Error("Postfix operators are not yet implemented");
        }

        throw new Error("Unknown unary operator " + expr.operator);
    }

    visitArrayConstructionExpression(expr: ArrayConstructionExpression, ctx: Context): string {
        this.i("debug", "visitArrayConstructionExpression");

        if (!(expr.inferredType! instanceof ArrayType)) {
            throw new Error("Invalid array construction expression, expected array got " + expr.inferredType?.toString());
        }

        let arraySize = expr.elements.length;
        let arrayType: ArrayType = expr.inferredType.to(ctx, ArrayType) as ArrayType;
        let elementType = arrayType.arrayOf;
        let elementSize = getDataTypeByteSize(elementType);

        let arrayReg = this.generateTmp();

        // allocate the array
        this.i("a_alloc", arrayReg, arraySize, elementSize);

        // copy the elements into the array
        for (let i = 0; i < arraySize; i++) {
            this.i("debug", "copying array element " + i);
            let resReg = this.visitExpression(expr.elements[i], ctx);

            let aSet = arraySetIndexType(ctx, elementType);
            let indexReg = this.generateTmp();
            this.i("const_u64", indexReg, i);
            this.i(aSet, arrayReg, indexReg, resReg);

            this.destroyTmp(resReg);
            this.destroyTmp(indexReg);
        }

        return arrayReg;
    }


    /**
     * used to transform things like x+=1 or x[i] += 1 or x[i]++ etc
     */
    buildOpAssignBinaryExpr(ctx: Context, left: Expression, right: Expression, operator: BinaryExpressionOperator, inferredType: DataType): Expression {
        /**
         * 
         * 
        let one = new IntLiteral(expr.location, 1);
        let addExpr = new BinaryExpression(expr.location, expr.expression, one, expr.operator == "pre++"?"+":"-");
 
 
            // Support case of ++x[i]
        let assignExpr: BinaryExpression | IndexSetExpression | null = null;
        if(expr.expression instanceof IndexAccessExpression){
            assignExpr = new IndexSetExpression(expr.location, expr.expression.lhs, expr.expression.indexes, addExpr);
        }
        else {
            assignExpr = new BinaryExpression(expr.location, expr.expression, addExpr, "=");
        }
        
 
        assignExpr.infer(ctx, expr.inferredType);
        */
        let addExpr = new BinaryExpression(left.location, left, right, operator);

        /**
         * Support case of ++x[i]
         */
        let assignExpr: BinaryExpression | IndexSetExpression | null = null;
        if (left instanceof IndexAccessExpression) {
            assignExpr = new IndexSetExpression(left.location, left.lhs, left.indexes, addExpr);
        }
        else {
            assignExpr = new BinaryExpression(left.location, left, addExpr, "=");
        }


        assignExpr.infer(ctx, inferredType);

        return assignExpr;
    }

    /**
     * Statements
     */
    visitStatement(stmt: Statement, ctx: Context) {
        if (stmt instanceof ExpressionStatement) {
            let res = this.visitExpression(stmt.expression, ctx);
            this.destroyTmp(res);
        }
        else if (stmt instanceof BlockStatement) this.visitBlockStatement(stmt, ctx);
        else if (stmt instanceof BreakStatement) this.visitBreakStatement(stmt, ctx);
        else if (stmt instanceof ContinueStatement) this.visitContinueStatement(stmt, ctx);
        else if (stmt instanceof DoWhileStatement) this.visitDoWhileStatement(stmt, ctx);
        else if (stmt instanceof ForeachStatement) this.visitForeachStatement(stmt, ctx);
        else if (stmt instanceof ForStatement) this.visitForStatement(stmt, ctx);
        else if (stmt instanceof FunctionDeclarationStatement) this.visitFunctionDeclarationStatement(stmt, ctx);
        else if (stmt instanceof IfStatement) this.visitIfStatement(stmt, ctx);
        else if (stmt instanceof MatchStatement) this.visitMatchStatement(stmt, ctx);
        else if (stmt instanceof ReturnStatement) this.visitReturnStatement(stmt, ctx);
        else if (stmt instanceof VariableDeclarationStatement) this.visitVariableDeclarationStatement(stmt, ctx);
        else if (stmt instanceof WhileStatement) this.visitWhileStatement(stmt, ctx);
        else { 
            throw new Error("Unknown statement type " + stmt.constructor.name);
        }
    }

    visitBlockStatement(stmt: BlockStatement, ctx: Context) {
        this.i("debug", "Entering block " + stmt.context.uuid);
        for(const [i, s] of stmt.statements.entries()){
            this.visitStatement(s, stmt.context);
        }
        this.i("debug", "Exiting block " + stmt.context.uuid);
    }
    visitBreakStatement(stmt: BreakStatement, ctx: Context) {
        // TODO: check how break works with for loops
        let loopScope = ctx.getInnerLoopContext();

        if (loopScope == null) {
            throw new Error("Cannot break outside of a loop");
        }
        this.i("debug", "break statement");

        // end of scope label is the label of the loop prefixed with end-of-scope
        this.i("j", loopScope.generateEndOfContextLabel());
    }
    visitContinueStatement(stmt: ContinueStatement, ctx: Context) {
        let loopScope = ctx.getInnerLoopContext();

        if (loopScope == null) {
            throw new Error("Cannot continue outside of a loop");
        }

        this.i("debug", "continue statement");
        this.i("j", loopScope.uuid);
    }
    visitDoWhileStatement(stmt: DoWhileStatement, ctx: Context) {
        this.i("debug", "do-while statement");
        // generate the label first
        this.i("label", stmt.body.context.uuid);

        // generate the body
        this.i("debug", "do-while statement body");
        this.visitStatement(stmt.body, stmt.body.context);

        // generate the condition
        this.i("debug", "do-while statement condition");
        let resTmp = this.visitExpression(stmt.condition, stmt.body.context);

        // u8 because all logical operators return u8
        let tmp = this.generateTmp();
        this.i("const_u8", tmp, 0)
        this.i("j_cmp_u8", resTmp, tmp, 1, stmt.body.context.uuid);
        this.destroyTmp(tmp);


        // generate the jump instruction
        this.i("debug", "do-while statement jump");

        this.i("debug", "do-while statement end of scope");
        // generate the end of scope label for break statements
        this.i("label", stmt.body.context.generateEndOfContextLabel());
    }
    visitForeachStatement(stmt: ForeachStatement, ctx: Context) {
        throw new Error("Method not implemented.");
    }
    visitForStatement(stmt: ForStatement, ctx: Context) {
        // start with the initialization
        this.i("debug", "for-statement init");
        for (let init of stmt.initializers) {
            this.visitStatement(init, stmt.context);
        }

        // generate the label for continue
        this.i("debug", "for-statement label");
        this.i("label", stmt.context.uuid);

        // generate the conditions
        this.i("debug", "for-statement condition");
        if (stmt.condition) {
            let resTmp = this.visitExpression(stmt.condition, stmt.context);

            let tmp = this.generateTmp();
            // u8 because all logical operators return u8
            this.i("const_u8", tmp, 0)
            this.i("j_cmp_u8", resTmp, tmp, 0, stmt.context.generateEndOfContextLabel());
            this.destroyTmp(tmp);
            this.destroyTmp(resTmp);

        }

        // generate the body
        this.i("debug", "for-statement body");
        this.visitStatement(stmt.body, stmt.context);

        // generate the increment
        this.i("debug", "for-statement increment");
        for (let inc of stmt.incrementors) {
            this.visitExpression(inc, stmt.context); // we do not need to store the result
        }

        // generate the jump instruction to continue the loop, unconditionally
        this.i("debug", "for-statement jump");
        this.i("j", stmt.context.uuid);

        // generate the end of scope label for break statements
        this.i("debug", "for-statement end of scope");
        this.i("label", stmt.context.generateEndOfContextLabel());
    }
    visitFunctionDeclarationStatement(stmt: FunctionDeclarationStatement, ctx: Context) {
        // function declarations are already generated, as they are moved to the base global context
        // and generated there
        return ;
    }
    visitIfStatement(stmt: IfStatement, ctx: Context) {
        this.i("debug", "if-statement");
        /**
         * how if-else blocks are generated:
         * j block1 if cond1
         * j block2 if cond2
         * ...
         * j elseBlock if else block exists
         * j end (in case of no else)
         * block1: .., j end
         * block2: .., j end
         * ...
         * elseBlock: ..
         * end: [next instruction]
         */
        // generate the condition
        for (let ifBlock in stmt.ifBlocks) {
            let condition = stmt.ifBlocks[ifBlock].expression;
            let block = stmt.ifBlocks[ifBlock].statement;

            this.i("debug", "if-statement condition");
            let resTmp = this.visitExpression(condition, block.context);
            //let resTmp2 = this.generateTmp();
            let tmp = this.generateTmp();
            this.i("const_u8", tmp, 0)
            this.i("debug", "if-statement jump");
            this.i("j_cmp_u8", resTmp, tmp, 1, block.context.uuid);
            this.destroyTmp(tmp);
            this.destroyTmp(resTmp);
        }

        if (stmt.elseBody) {
            this.i("debug", "if-statement else block stmt");
            this.i("j", stmt.elseBody.context.uuid);
        }

        // add the jump to the end of the if statement block all together
        this.i("debug", "if-statement end  stmt");
        this.i("j", stmt._endOfBlockLabel);

        // generate the blocks
        for (let ifBlock in stmt.ifBlocks) {
            let block = stmt.ifBlocks[ifBlock].statement;
            this.i("debug", "if-statement block");
            this.i("label", block.context.uuid);
            this.visitStatement(block, block.context);
            this.i("debug", "if-statement block end jump");
            this.i("j", stmt._endOfBlockLabel);
        }

        // generate the else block
        if (stmt.elseBody) {
            this.i("debug", "if-statement else block");
            this.i("label", stmt.elseBody.context.uuid);
            this.visitStatement(stmt.elseBody, stmt.elseBody.context);
        }

        // generate the end of block label
        this.i("debug", "if-statement end of stmt");
        this.i("label", stmt._endOfBlockLabel);

    }
    visitMatchStatement(stmt: MatchStatement, ctx: Context) {
        throw new Error("Method not implemented.");
    }
    visitReturnStatement(stmt: ReturnStatement, ctx: Context) {
        if (stmt.returnExpression) {
            let tmp = this.visitExpression(stmt.returnExpression, ctx);
            this.i("debug", "return statement " + tmp);
            let retInst = retType(ctx, stmt.returnExpression.inferredType!);
            this.i(retInst, tmp);
        }
        else {
            this.i("debug", "return statement void");
            this.i("ret_void");
        }
    }
    visitVariableDeclarationStatement(stmt: VariableDeclarationStatement, ctx: Context) {
        for (let decl of stmt.variables) {
            // translate the expression into <left> = <right>
            let left: Expression = new ElementExpression(decl.location, decl.name);
            let right = decl.initializer;
            let assign = new BinaryExpression(decl.location, left, right, "=");
            // we need to set ignoreConst to true, because we the variable might be const,
            // and we are changing the structure of the assignment
            assign.infer(ctx, decl.annotation);
            let tmp = this.visitExpression(assign, ctx);
            this.destroyTmp(tmp);
        }
    }
    visitWhileStatement(stmt: WhileStatement, ctx: Context) {
        // generate the label first
        this.i("debug", "while statement");
        let conditionLabel = this.generateLabel();
        this.i("label", conditionLabel);

        // generate the condition
        this.i("debug", "while statement condition");
        let resTmp = this.visitExpression(stmt.condition, stmt.body.context);
        // if the condition is false, jump to the end of the scope
        // u8 because all logical operators return u8
        let tmp = this.generateTmp();
        this.i("const_u8", tmp, 0)
        this.i("j_cmp_u8", resTmp, tmp, 1, stmt.body.context.uuid);
        this.destroyTmp(tmp);
        this.destroyTmp(resTmp);
        // generate the jump instruction
        this.i("debug", "while statement jump");
        // generate the opposite jump instruction
        this.i("debug", "while statement jump");
        this.i("j", stmt.body.context.generateEndOfContextLabel());

        // generate the body
        this.i("debug", "while statement body");
        this.i("label", stmt.body.context.uuid);
        this.visitStatement(stmt.body, stmt.body.context);
        // generate the jump instruction
        this.i("debug", "while statement jump");
        this.i("j", conditionLabel);

        // generate the end of scope label for break statements
        this.i("debug", "while statement end of scope");
        this.i("label", stmt.body.context.generateEndOfContextLabel());
    }




    dumpIR() {
        for(let [i, inst] of this.instructions.entries()){
            //if(inst.type == "debug") {
            //    continue
            //}
            // console.log(`[${i}] ${inst.type} ${inst.args.join(",")}`);
        }
    }
}