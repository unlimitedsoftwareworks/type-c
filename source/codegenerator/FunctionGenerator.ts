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

import {
    ArrayConstructionExpression,
    ArrayUnpackingExpression,
} from "../ast/expressions/ArrayConstructionExpression";
import { ArrayDeconstructionExpression } from "../ast/expressions/ArrayDeconstructionExpression";
import {
    BinaryExpression,
    BinaryExpressionOperator,
} from "../ast/expressions/BinaryExpression";
import { CastExpression } from "../ast/expressions/CastExpression";
import { CoroutineConstructionExpression } from "../ast/expressions/CoroutineConstructionExpression";
import { DoExpression } from "../ast/expressions/DoExpression";
import { ElementExpression } from "../ast/expressions/ElementExpression";
import { Expression } from "../ast/expressions/Expression";
import { FunctionCallExpression } from "../ast/expressions/FunctionCallExpression";
import { IfElseExpression } from "../ast/expressions/IfElseExpression";
import { IndexAccessExpression } from "../ast/expressions/IndexAccessExpression";
import { IndexSetExpression } from "../ast/expressions/IndexSetExpression";
import { InstanceCheckExpression } from "../ast/expressions/InstanceCheckExpression";
import {
    LambdaDefinition,
    LambdaExpression,
} from "../ast/expressions/LambdaExpression";
import { LetInExpression } from "../ast/expressions/LetInExpression";
import {
    BinaryStringLiteralExpression,
    CharLiteralExpression,
    DoubleLiteralExpression,
    FalseLiteralExpression,
    FloatLiteralExpression,
    HexIntLiteralExpression,
    IntLiteralExpression,
    LiteralExpression,
    NullLiteralExpression,
    StringLiteralExpression,
    TrueLiteralExpression,
} from "../ast/expressions/LiteralExpression";
import { MatchExpression } from "../ast/expressions/MatchExpression";
import { MemberAccessExpression } from "../ast/expressions/MemberAccessExpression";
import {
    NamedStructConstructionExpression,
    StructKeyValueExpressionPair,
} from "../ast/expressions/NamedStructConstructionExpression";
import { NewExpression } from "../ast/expressions/NewExpression";
import { StructDeconstructionExpression } from "../ast/expressions/StructDeconstructionExpression";
import { ThisExpression } from "../ast/expressions/ThisExpression";
import { TupleConstructionExpression } from "../ast/expressions/TupleConstructionExpression";
import { TupleDeconstructionExpression } from "../ast/expressions/TupleDeconstructionExpression";
import { UnaryExpression } from "../ast/expressions/UnaryExpression";
import { UnnamedStructConstructionExpression } from "../ast/expressions/UnnamedStructConstructionExpression";
import { checkSubPattern } from "../ast/matching/PatternUtils";
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
import { DeclaredFunction, DeclaredOverloadedFunction } from "../ast/symbol/DeclaredFunction";
import { DeclaredType } from "../ast/symbol/DeclaredType";
import { DeclaredVariable } from "../ast/symbol/DeclaredVariable";
import { FunctionArgument } from "../ast/symbol/FunctionArgument";
import { getSymbolType } from "../ast/symbol/SymbolType";
import { SymbolLocation } from "../ast/symbol/SymbolLocation";
import { VariablePattern } from "../ast/symbol/VariablePattern";
import { ArrayType } from "../ast/types/ArrayType";
import { BasicType, BasicTypeKind } from "../ast/types/BasicType";
import { BooleanType } from "../ast/types/BooleanType";
import { ClassType } from "../ast/types/ClassType";
import { DataType } from "../ast/types/DataType";
import { EnumType } from "../ast/types/EnumType";
import { FFIMethodType } from "../ast/types/FFIMethodType";
import { FunctionType } from "../ast/types/FunctionType";
import { InterfaceType } from "../ast/types/InterfaceType";
import {
    MetaClassType,
    MetaEnumType,
    MetaType,
    MetaVariantConstructorType,
} from "../ast/types/MetaTypes";
import { NullableType } from "../ast/types/NullableType";
import { StructType } from "../ast/types/StructType";
import { TupleType } from "../ast/types/TupleType";
import { VariantConstructorType, VariantParameter } from "../ast/types/VariantConstructorType";
import { VariantType } from "../ast/types/VariantType";
import { VoidType } from "../ast/types/VoidType";
import { canCastTypes, getLargestStruct, isStringClass, matchDataTypes } from "../typechecking/TypeChecking";
import { signatureFromGenerics } from "../typechecking/TypeInference";
import { IRInstruction, IRInstructionType } from "./bytecode/IR";
import { CastType, generateCastInstruction } from "./CastAPI";
import {
    arrayGetIndexType,
    arrayGetReverseIndexType,
    arraySetIndexType,
    arraySetReverseIndexType,
    classGetFieldType,
    classSetFieldType,
    closurePushEnvType,
    constType,
    fnGetRetType,
    fnSetArgType,
    getBinaryInstruction,
    getFnReturnType,
    getUnaryInstruction,
    globalType,
    isPointer,
    jCmpNullType,
    popStackType,
    pushStackType,
    retType,
    structCopyFieldType,
    structGetFieldJmpType,
    structGetFieldType,
    structSetFieldType,
    tmpType,
} from "./CodeGenTypes";
import { allocateRegisters } from "./RegisterAllocator";
import { getDataTypeByteSize } from "./utils";
import { FunctionCodegenProps } from "./FunctionCodegenProps";
import { YieldExpression } from "../ast/expressions/YieldExpression";
import { CoroutineType } from "../ast/types/CoroutineType";
import { MutateExpression } from "../ast/expressions/MutateExpression";
import { TemplateSegment } from "./TemplateSegment";
import { UnreachableExpression } from "../ast/expressions/UnreachableExpression";
import { NamespaceType } from "../ast/types/NamespaceType";
import { DeclaredNamespace } from "../ast/symbol/DeclaredNamespace";
import { ThisDistributedAssignExpression } from "../ast/expressions/ThisDistributedAssignExpression";
import { ReverseIndexAccessExpression } from "../ast/expressions/ReverseIndexAccessExpression";
import { ReverseIndexSetExpression } from "../ast/expressions/ReverseIndexSetExpression";
import { NullType } from "../ast/types/NullType";
import { BuiltinModules } from "../BuiltinModules";
import { compareStringToEnum, convertForeachAbstractIterableToFor, convertForeachArrayToFor, convertStringEq, convertStringNotEq } from "./ASTTransformers";
import { ThrowExpression } from "../ast/expressions/ThrowExpression";
import { StringEnumType } from "../ast/types/StringEnumType";
import { PartialStructType } from "../ast/types/PartialStruct";

export type FunctionGenType = DeclaredFunction | ClassMethod | LambdaDefinition;

/**
 * Utility functions
 */
export function isLocalVariable(expr: Expression, ctx: Context) {
    if (expr instanceof ElementExpression) {
        let symScope = ctx.lookupScope(expr.name);

        if (
            symScope?.sym instanceof DeclaredVariable ||
            symScope?.sym instanceof VariablePattern
        ) {
            return symScope.scope == "local";
        }
    }
    return false;
}

export function isFunctionArgument(expr: Expression, ctx: Context) {
    if (expr instanceof ElementExpression) {
        let symScope = ctx.lookupScope(expr.name);
        // TODO: check if this is correct
        if (
            symScope?.sym instanceof FunctionArgument &&
            symScope?.scope == "local"
        ) {
            return true;
        }
    }

    return false;
}

export function isGlobalVariable(expr: Expression, ctx: Context) {
    if (expr instanceof ElementExpression) {
        let symScope = ctx.lookupScope(expr.name);

        if (
            symScope?.sym instanceof DeclaredVariable ||
            symScope?.sym instanceof VariablePattern
        ) {
            return symScope.scope == "global";
        }
    }
    return false;
}

export function isUpvalueVariable(expr: Expression, ctx: Context) {
    if (expr instanceof ElementExpression) {
        let symScope = ctx.lookupScope(expr.name);

        if (
            symScope?.sym instanceof DeclaredVariable ||
            symScope?.sym instanceof VariablePattern ||
            symScope?.sym instanceof FunctionArgument
        ) {
            return symScope.scope == "upvalue";
        }
    }
    return false;
}

export class FunctionGenerator {
    templateSegment: TemplateSegment;
    // IR instructions
    instructions: IRInstruction[] = [];

    // current function being generated
    fn: FunctionGenType;

    // is global code
    isGlobal: boolean;

    // tmp variables counter
    static tmpCounter = 0;
    static reset() {
        FunctionGenerator.tmpCounter = 0;
    }

    // labels counter
    lblCounter = 0;

    // graph coloring output
    coloring: Map<string, number> = new Map();

    doExpressionLabelStack: string[] = [];
    doExpressionTmpStack: string[] = [];
    coalescingLabelStack: string[] = [];

    // labels of the current loop, nested loops will be pushed to the stack
    // a break or continue statement will use the last label in the stack
    loopBeginLabelStack: string[] = [];
    loopEndLabelStack: string[] = [];

    constructor(fn: FunctionGenType, templateSegment: TemplateSegment, isGlobal: boolean = false) {
        this.fn = fn;
        this.templateSegment = templateSegment;
        this.isGlobal = isGlobal;
    }

    generateTmp(): string {
        let name = "tmp_" + FunctionGenerator.tmpCounter++;
        return name;
    }

    generateLabel(): string {
        let lbl = "lbl_" + this.fn.context.uuid + ("_" + this.lblCounter++);

        return lbl;
    }
    
    pushLoopLabels(begin: string, end: string){
        this.loopBeginLabelStack.push(begin);
        this.loopEndLabelStack.push(end);
    }

    popLoopLabels(){
        this.loopBeginLabelStack.pop();
        this.loopEndLabelStack.pop();
    }

    pushCoalescingLabel(lbl: string){
        this.coalescingLabelStack.push(lbl);
    }

    popCoalescingLabel(){
        this.coalescingLabelStack.pop();
    }

    getCoalescingLabel(): string | null{
        if(this.coalescingLabelStack.length == 0){
            return null;
        }
        return this.coalescingLabelStack[this.coalescingLabelStack.length - 1];
    }

    getLoopBeginLabel(){
        return this.loopBeginLabelStack[this.loopBeginLabelStack.length - 1];
    }

    getLoopEndLabel(){
        return this.loopEndLabelStack[this.loopEndLabelStack.length - 1];
    }

    // generates an IR instruction
    i(type: IRInstructionType, ...args: (string | number)[]) {
        if (type == "ret_ptr" && args[0] == "") {
            console.log(this.fn.name);
        }
        if (type == null) {
            throw new Error("IR instruction type is null");
        }

        this.instructions.push(new IRInstruction(type, args));
    }

    srcMapPushLoc(loc: SymbolLocation) {
        this.i(
            "srcmap_push_loc",
            loc.file,
            loc.line,
            loc.col,
            this.fn.name || "<unknown>",
        );
    }

    srcMapPopLoc() {
        this.i("srcmap_pop_loc");
    }

    destroyTmp(reg: string) {
        this.i("destroy_tmp", reg);
    }

    getLastInstruction(): IRInstruction {
        // return last non debug instruction
        for (let i = this.instructions.length - 1; i >= 0; i--) {
            if (
                this.instructions[i].type != "debug" &&
                !this.instructions[i].type.startsWith("srcmap")
            ) {
                return this.instructions[i];
            }
        }
        return this.instructions[0];
    }

    generate() {
        // generate IR instructions for the function
        if (!this.isGlobal) {
            this.fn.codeGenProps.computeStack();
        }

        this.srcMapPushLoc(this.fn.location);

        this.generateIR()
        this.allocateRegisters();
    }

    generateIR(){
        this.i("debug", "fn " + this.fn.context.uuid + ":" + this.fn.name);
        if (!this.isGlobal) {
            this.i("fn", this.fn.context.uuid);
        }

        let body: BlockStatement | null = this.fn.body;
        let expression: Expression | null = this.fn.expression;

        if (this.fn instanceof LambdaDefinition) {
            body = this.fn.lambdaExpression.body;
            expression = this.fn.lambdaExpression.expression;
        }

        this.prepareArgsIfMain()

        if (body) {
            this.visitStatement(body, this.fn.context);
            if (
                !this.getLastInstruction().type.startsWith("ret_") &&
                !this.isGlobal
            ) {
                this.ir_generate_end_ret();
            }
        } else {
            this.srcMapPushLoc(this.fn.location);
            let tmp = "";
            if (expression instanceof TupleConstructionExpression) {
                this.ir_generate_tuple_return(this.fn.context, expression);
                this.ir_generate_end_ret();
            } else if (
                expression?.inferredType?.is(this.fn.context, TupleType)
            ) {
                // we have a function call that returns a tuple
                let tmp = this.visitExpression(expression, this.fn.context);
                this.destroyTmp(tmp);

                // get all the return values
                let tupleType = expression!.inferredType!.to(
                    this.fn.context,
                    TupleType,
                ) as TupleType;
                for (let i = 0; i < tupleType.types.length; i++) {
                    let tmp = this.generateTmp();
                    let read = fnGetRetType(tupleType.types[i]);
                    let ret = retType(tupleType.types[i]);
                    this.i(read, tmp, 255 - i);
                    this.i(ret, tmp, i);
                    this.destroyTmp(tmp);
                }
                this.ir_generate_end_ret();
            } else {
                tmp = this.visitExpression(expression!, this.fn.context);
                // check if the function is not void
                if (
                    this.fn.codeGenProps.parentFnType &&
                    this.fn.codeGenProps.parentFnType.returnType &&
                    this.fn.codeGenProps.parentFnType.returnType.kind !=
                        "void" &&
                    this.fn.codeGenProps.parentFnType.returnType.kind !=
                        "unset" &&
                    !this.fn.isCoroutineCallable
                ) {
                    let instr = retType(
                        this.fn.codeGenProps.parentFnType.returnType,
                    );
                    // TODO: handle tuple for expression-functions return here
                    this.i(instr, tmp, 0);
                    this.ir_generate_end_ret();
                } else {
                    this.destroyTmp(tmp);
                    this.ir_generate_end_ret();
                }
            }
            this.srcMapPopLoc();
        }
    }

    /**
     * Checks if the function is a main function and prepares the arguments
     */
    prepareArgsIfMain() {
        /**
         * Check if we have a main to extract the arguments
         */
        if((this.fn instanceof DeclaredFunction) && (this.fn.name == "main")){
            // get the argument
            if (this.fn.prototype.header.parameters.length > 0){
                let argType = this.fn.prototype.header.parameters[0].type;
                let argName = this.fn.prototype.header.parameters[0].name;
                let res = matchDataTypes(
                    this.fn.context,
                    argType,
                    new ArrayType(
                        this.fn.location,
                        BuiltinModules.String!,
                    ),
                );

                if(res.success){
                    let func = new FunctionCallExpression(
                        this.fn.location,
                        new ElementExpression(
                            this.fn.location,
                            "$transformArgs"
                        ),
                        []
                    )
                    let expr = new BinaryExpression(
                        this.fn.location,
                        new ElementExpression(this.fn.location, argName),
                        func,
                        "="
                    )

                    expr.infer(this.fn.context, null, {ignoreConst: true})
                    this.visitExpression(
                        expr,
                        this.fn.context
                    )
                }
            }
        }
    }

    allocateRegisters() {
        // allocate registers
        //this.instructions = this.instructions.filter((i) => !i.type.startsWith("debug") && !i.type.startsWith("srcmap"));
        //this.instructions = this.instructions.filter((i) => !i.type.startsWith("srcmap"));
        //this.instructions = instructions;
        //console.log(this.instructions.map(e => e.toString()).join("\n"))
        let { coloring, instructions } = allocateRegisters(
            this.fn.codeGenProps,
            this.instructions,
        );
        this.instructions = instructions;
        this.applyColoring(coloring);

        /*
        console.log(this.fn.context.uuid)
        console.log(coloring)
        */
    }

    applyColoring(coloring: Map<string, number>) {
        this.coloring = coloring;
    }

    /**
     * Visits an expression and generates IR instructions for it.
     * Returns the register that the result of the expression is stored in.
     * @param expr the expression to visit
     * @param ctx active context of the expression
     */
    visitExpression(expr: Expression, ctx: Context): string {
        this.srcMapPushLoc(expr.location);
        let tmp = ""; // placeholder for the result of the expression
        /**
         * Checks for all the following expressions and calls the corresponding visit method:
         *  ArrayConstructionExpression		ElementExpression			IndexSetExpression			MatchExpression			SpawnExpression			UnnamedStructConstructionExpression
            AwaitExpression			Expression				InstanceCheckExpression		MemberAccessExpression		ThisExpression
            BinaryExpression			FunctionCallExpression		LambdaExpression			NamedStructConstructionExpression	TupleConstructionExpression
            CastExpression			IfElseExpression			LetInExpression			NewExpression			TupleDeconstructionExpression
            CoroutineConstructionExpression	IndexAccessExpression		LiteralExpression			NullableMemberAccessExpression	UnaryExpression
         */
        if (expr instanceof ArrayConstructionExpression)
            tmp = this.visitArrayConstructionExpression(expr, ctx);
        else if (expr instanceof ElementExpression)
            tmp = this.visitElementExpression(expr, ctx);
        else if (expr instanceof IndexAccessExpression)
            tmp = this.visitIndexAccessExpression(expr, ctx);
        else if (expr instanceof IndexSetExpression)
            tmp = this.visitIndexSetExpression(expr, ctx);
        else if (expr instanceof ReverseIndexAccessExpression)
            tmp = this.visitReverseIndexAccessExpression(expr, ctx);
        else if (expr instanceof ReverseIndexSetExpression)
            tmp = this.visitReverseIndexSetExpression(expr, ctx);
        else if (expr instanceof MatchExpression)
            tmp = this.visitMatchExpression(expr, ctx);
        else if (expr instanceof UnnamedStructConstructionExpression)
            tmp = this.visitUnnamedStructConstructionExpression(expr, ctx);
        else if (expr instanceof InstanceCheckExpression)
            tmp = this.visitInstanceCheckExpression(expr, ctx);
        else if (expr instanceof MemberAccessExpression)
            tmp = this.visitMemberAccessExpression(expr, ctx);
        else if (expr instanceof ThisExpression)
            tmp = this.visitThisExpression(expr, ctx);
        else if (expr instanceof BinaryExpression)
            tmp = this.visitBinaryExpression(expr, ctx);
        else if (expr instanceof FunctionCallExpression)
            tmp = this.visitFunctionCallExpression(expr, ctx);
        else if (expr instanceof LambdaExpression)
            tmp = this.visitLambdaExpression(expr, ctx);
        else if (expr instanceof NamedStructConstructionExpression)
            tmp = this.visitNamedStructConstructionExpression(expr, ctx);
        else if (expr instanceof TupleConstructionExpression)
            tmp = this.visitTupleConstructionExpression(expr, ctx);
        else if (expr instanceof TupleDeconstructionExpression)
            tmp = this.visitTupleDeconstructionExpression(expr, ctx);
        else if (expr instanceof CastExpression)
            tmp = this.visitCastExpression(expr, ctx);
        else if (expr instanceof IfElseExpression)
            tmp = this.visitIfElseExpression(expr, ctx);
        else if (expr instanceof LetInExpression)
            tmp = this.visitLetInExpression(expr, expr.context);
        else if (expr instanceof NewExpression)
            tmp = this.visitNewExpression(expr, ctx);
        else if (expr instanceof LiteralExpression)
            tmp = this.visitLiteralExpression(expr, ctx);
        else if (expr instanceof UnaryExpression)
            tmp = this.visitUnaryExpression(expr, ctx);
        else if (expr instanceof DoExpression)
            tmp = this.visitDoExpression(expr, ctx);
        else if (expr instanceof CoroutineConstructionExpression)
            tmp = this.visitCoroutineConstructionExpression(expr, ctx);
        else if (expr instanceof YieldExpression)
            tmp = this.visitYieldExpression(expr, ctx);
        else if (expr instanceof MutateExpression)
            tmp = this.visitMutateExpression(expr, ctx);
        else if (expr instanceof UnreachableExpression)
            tmp = this.visitUnreachableExpression(expr, ctx);
        else if (expr instanceof ThrowExpression)
            tmp = this.visitThrowExpression(expr, ctx);
        else if (expr instanceof ThisDistributedAssignExpression)
            tmp = this.visitThisDistributedAssignExpression(expr, ctx);
        else throw new Error("Invalid expression!" + expr.toString());

        if (tmp != "") {
            return this.handleTypeCasting(expr, ctx, tmp);
        }
        this.srcMapPopLoc();
        return tmp;
    }

    handleTypeCasting(expr: Expression, ctx: Context, tmp: string) {
        let inferredType = expr.inferredType?.dereference();
        let hintType = expr.hintType?.dereference();

        
        if (hintType != undefined && hintType.kind != "void") {
            let requireSafe =
                inferredType instanceof NullableType ||
                hintType instanceof NullableType;
            
            // one exception, if the hint is a boolean, it becomes a regular cast
            // since the result is true or false 

            if(hintType.kind == "bool") {
                requireSafe = false;
            }

            this.i(
                "debug",
                "casting from " + inferredType?.kind + " to " + hintType?.kind,
            );
            tmp = this.visitCastExpression(
                new CastExpression(
                    expr.location,
                    expr,
                    hintType,
                    requireSafe ? "safe" : "regular",
                ),
                ctx,
                tmp,
            );
        }

        return tmp;
    }

    visitElementExpression(expr: ElementExpression, ctx: Context): string {
        this.i("debug", "element " + expr.name);

        let symScope = ctx.lookupScope(expr.name);
        if (symScope == null) {
            throw new Error("Undefined variable " + expr.name);
        }


        const sym = symScope.sym;
        ctx.lookupScope(expr.name);
        if (sym instanceof DeclaredVariable) {
            let tmp = this.generateTmp();
            let instruction = tmpType(sym.annotation!);

            // there is an exception that is applied to namespaces here, a variable declared in a namespace is not a local variable
            // so we check the global context for sym.id, if our content is a namespace we return the global value
            if(ctx.getOwner() instanceof DeclaredNamespace || sym.parentContext?.getOwner() instanceof DeclaredNamespace){
                this.i(instruction, tmp, "global", sym.uid);
            } else if (symScope.scope == "global") {
                this.i(instruction, tmp, "global", sym.uid);
            } else if (symScope.scope == "local") {
                this.i(instruction, tmp, "local", sym.uid);
            } else {
                // for upvalue, we use arg
                this.i(instruction, tmp, "arg", sym.uid);
            }

            return tmp;
        } else if (sym instanceof VariablePattern) {
            // like regular local variable
            let tmp = this.generateTmp();
            let instruction = tmpType(sym.type);
            // either local or upvalue or global
            this.i(instruction, tmp, symScope.scope, sym.uid);
            return tmp;
        } else if (sym instanceof FunctionArgument) {
            let tmp = this.generateTmp();
            let instruction = tmpType(sym.type);
            // either arg or upvalue
            this.i(instruction, tmp, symScope.scope, sym.uid);
            return tmp;
        } else if (sym instanceof DeclaredFunction) {
            if(expr._functionReference) {
                let fnCtxID = expr._functionReference.context.uuid;
                return this.ir_generate_closure(ctx, expr._functionReference.codeGenProps, fnCtxID);
            }
            // in case of generics:
            let signature = signatureFromGenerics(expr.typeArguments);

            if (sym.isGeneric()) {
                let concreteFn = sym.getConcreteMethod(signature);
                let fnCtxID = concreteFn.context.uuid;
                return this.ir_generate_closure(
                    ctx,
                    concreteFn.codeGenProps,
                    fnCtxID,
                );
            } else {
                let fnCtxID = sym.context.uuid;
                return this.ir_generate_closure(ctx, sym.codeGenProps, fnCtxID);
            }
        } else if (sym instanceof DeclaredOverloadedFunction) {
            if(expr._functionReference) {
                
                let fnCtxID = expr._functionReference.context.uuid;
                return this.ir_generate_closure(ctx, expr._functionReference.codeGenProps, fnCtxID);
            }
            else {
                throw new Error("No function reference found for overloaded function " + sym.name);
            }
        }
        else {
            throw new Error("Invalid symbol type " + symScope.sym.kind);
        }
    }

    visitIndexAccessExpression(
        expr: IndexAccessExpression,
        ctx: Context,
    ): string {
        let inferredType = expr.lhs.inferredType!.dereference();
        if (inferredType.is(ctx, ArrayType)) {
            return this.ir_generate_array_access(expr, ctx);
        }

        // else check if it is a method call
        if (!expr.operatorOverloadState.isMethodCall) {
            throw new Error(
                "Invalid index access expression, expected array or callable got " +
                    expr.inferredType?.toString(),
            );
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
                    expr.operatorOverloadState.methodRef!.name,
                ),
            ),
            expr.indexes,
        );

        methodCall.infer(ctx, expr.hintType);

        return this.visitFunctionCallExpression(methodCall, ctx);
    }

    visitReverseIndexAccessExpression(
        expr: ReverseIndexAccessExpression,
        ctx: Context,
    ): string {
        let inferredType = expr.lhs.inferredType!.dereference();
        if (inferredType.is(ctx, ArrayType)) {
            return this.ir_generate_reverse_array_access(expr, ctx);
        }

        // else check if it is a method call
        if (!expr.operatorOverloadState.isMethodCall) {
            throw new Error(
                "Invalid reverse index access expression, expected array or callable got " +
                    expr.inferredType?.toString(),
            );
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
                    expr.operatorOverloadState.methodRef!.name,
                ),
            ),
            [expr.index],
        );

        methodCall.infer(ctx, expr.hintType);

        return this.visitFunctionCallExpression(methodCall, ctx);
    }

    visitIndexSetExpression(expr: IndexSetExpression, ctx: Context): string {
        let mainExprType = expr.lhs.inferredType!.dereference();
        if (mainExprType instanceof ArrayType) {
            return this.ir_generate_array_set(expr, ctx, mainExprType);
        }

        /**
         * indexset expression on a class is a method call
         */

        this.i("debug", "replacing index set expression with method call");

        if (!expr.operatorOverloadState.isMethodCall) {
            ctx.parser.customError(
                "Invalid index set expression, expected method call",
                expr.location,
            );
        }

        let methodCall = new FunctionCallExpression(
            expr.location,
            new MemberAccessExpression(
                expr.location,
                expr.lhs,
                new ElementExpression(
                    expr.location,
                    expr.operatorOverloadState.methodRef!.name,
                ),
            ),
            [...expr.indexes, expr.value],
        );

        methodCall.infer(ctx, expr.hintType);

        return this.visitFunctionCallExpression(methodCall, ctx);
    }

    visitReverseIndexSetExpression(expr: ReverseIndexSetExpression, ctx: Context): string {
        let mainExprType = expr.lhs.inferredType!.dereference();
        if (mainExprType instanceof ArrayType) {
            return this.ir_generate_reverse_array_set(expr, ctx, mainExprType);
        }

        /**
         * indexset expression on a class is a method call
         */

        this.i("debug", "replacing reverse index set expression with method call");

        if (!expr.operatorOverloadState.isMethodCall) {
            ctx.parser.customError(
                "Invalid reverse index set expression, expected method call",
                expr.location,
            );
        }

        let methodCall = new FunctionCallExpression(
            expr.location,
            new MemberAccessExpression(
                expr.location,
                expr.lhs,
                new ElementExpression(
                    expr.location,
                    expr.operatorOverloadState.methodRef!.name,
                ),
            ),
            [expr.index, expr.value],
        );

        methodCall.infer(ctx, expr.hintType);

        return this.visitFunctionCallExpression(methodCall, ctx);
    }

    visitMatchExpression(expr: MatchExpression, ctx: Context): string {
        //let tmp = this.visitExpression(expr.expression, ctx);
        this.i("debug", "match expression");

        let switchLabels = expr.cases.map(() => this.generateLabel());
        let caseLabels = expr.cases.map(() => this.generateLabel());
        let endLabel = this.generateLabel();

        caseLabels.push(endLabel);
        switchLabels.push(endLabel);

        let tmpRes = this.generateTmp();

        let counter = 0;
        for (let case_ of expr.cases) {
            let e = checkSubPattern(
                case_.context,
                expr.expression,
                case_.pattern,
            );
            let cond =
                e.condition ||
                TrueLiteralExpression.makeLiteral(case_.location);
            let variables = e.variableAssignments;

            cond.infer(case_.context, new BooleanType(case_.location));
            // generate the condition
            this.i("label", switchLabels[counter]);
            let tmp = this.visitExpression(cond, case_.context);
            // fill in the variables
            if (variables.length > 0) {
                // we add a cmp to avoid filling in the variables if the condition is false
                let tmp2 = this.generateTmp();
                this.i("const_u8", tmp2, 0);
                this.i("j_cmp_u8", tmp, tmp2, 0, switchLabels[counter + 1]);
                this.destroyTmp(tmp2);

                // now we fill in the variables
                for (let variable of variables) {
                    let tmp2 = this.visitExpression(variable, case_.context);
                    this.destroyTmp(tmp2);
                }
            }

            if (case_.guard) {
                let guardTmp = this.visitExpression(case_.guard, case_.context);
                let andTmp = this.generateTmp();
                this.i("and", andTmp, tmp, guardTmp);
                this.destroyTmp(tmp);
                this.destroyTmp(guardTmp);

                let tmp2 = this.generateTmp();
                this.i("const_u8", tmp2, 0);
                this.i("j_cmp_u8", andTmp, tmp2, 1, caseLabels[counter]);
                this.destroyTmp(tmp2);
            } else {
                let tmp2 = this.generateTmp();
                this.i("const_u8", tmp2, 0);
                this.i("j_cmp_u8", tmp, tmp2, 1, caseLabels[counter]);
                this.destroyTmp(tmp2);
                this.destroyTmp(tmp);
            }
            counter++;
        }

        counter = 0;
        for (let case_ of expr.cases) {
            this.i("label", caseLabels[counter]);

            if (case_.expression) {
                let reg = this.visitExpression(case_.expression, case_.context);
                let instruction = tmpType(expr.inferredType!);
                this.i(instruction, tmpRes, "reg", reg);
                //this.destroyTmp(tmp);
            }

            this.i("j", endLabel);
            counter++;
        }

        this.i("label", endLabel);
        return tmpRes;
    }

    visitUnnamedStructConstructionExpression(
        expr: UnnamedStructConstructionExpression,
        ctx: Context,
    ): string {
        /**
         * s_alloc [dest] [num_fields] [struct_size]
         * s_set_offset [dest] [field_index] [offset]
         * a_set_field_[type] [dest] [field_index] [value
         */

        let structType = expr.inferredType!.to(ctx, StructType) as StructType;

        this.i("debug", "anonymous struct construction expression ");
        let { reg: tmp, sortedStruct } = this.ir_allocate_struct(
            ctx,
            structType,
        );

        this.i("debug", "anonymous struct field values");

        for (let i = 0; i < structType.fields.length; i++) {
            let field = structType.fields[i];
            let fieldInSortedStruct = sortedStruct.getField(field.name)!;

            let res = this.visitExpression(expr.elements[i], ctx);

            let inst = structSetFieldType(fieldInSortedStruct.type);
            this.i(inst, tmp, fieldInSortedStruct.getFieldID(), res);
            this.destroyTmp(res);
        }

        return tmp;
    }

    visitInstanceCheckExpression(
        expr: InstanceCheckExpression,
        ctx: Context,
    ): string {
        let reg = this.visitExpression(expr.expression, ctx);
        let actualType = expr.expression.inferredType!.dereference();
        let castType = expr.type.dereference();

        if((actualType.allowedNullable(ctx) || actualType.is(ctx, NullableType)) && castType.is(ctx, NullType)) {
            return this.ir_generate_null_instance_check(expr, ctx, reg, actualType, castType);
        }


        if (actualType instanceof ClassType) {
            return this.ir_generate_class_instance_check(
                expr,
                ctx,
                reg,
                actualType,
                castType,
            );
        }

        if (actualType.is(ctx, InterfaceType)) {
            return this.ir_generate_interface_instance_check(
                expr,
                ctx,
                reg,
                actualType,
                castType,
            );
        }
        if (actualType instanceof VariantType) {
            return this.ir_generate_variant_instance_check(
                expr,
                ctx,
                reg,
                actualType,
                castType,
            );
        }

        throw new Error(
            `Instance check expressions on ${actualType.getShortName()} are not yet implemented`,
        );
    }

    visitMemberAccessExpression(
        expr: MemberAccessExpression,
        ctx: Context,
    ): string {
        // first check if it a datatype access
        // datatype access: expr.lhs is element expression

        // a namespace access: interpreted as no access at all!
        // since they are flattened in the global context


        // check direct enum access Enum.Field
        if (expr.left instanceof ElementExpression) {
            let elementName = expr.left.name;

            let sym = ctx.lookup(elementName);

            if (sym instanceof DeclaredType) {
                // case 1: Enum
                if (sym.type.is(ctx, EnumType)) {
                    let enumType = sym.type.to(ctx, EnumType) as EnumType;
                    return this.ir_generate_enum_access(
                        expr,
                        ctx,
                        elementName,
                        sym,
                        enumType,
                    );
                }

                if (sym.type.is(ctx, ClassType)) {
                    let classType = sym.type.to(ctx, ClassType) as ClassType;
                    // case 2: Class static field access
                    // class static field access
                    // we treat as a global variable
                    let attr = classType.getAttribute(expr.right.name);

                    if(!attr || !attr?.isStatic){
                        throw "Unreachable code";
                    }
                    
                    let tmp = this.generateTmp();
                    let inst = tmpType(expr.left.inferredType!);
                    this.i(inst, tmp, "global", attr.uid);
                    return tmp;
                }

                // case 2: Variant
                // case 3: Interface static method
                // case 4: Class static method
            }
        }

        // with introduction of namespaces, we need to check for deep enum access
        if((expr.left instanceof MemberAccessExpression) && (expr.left.inferredType instanceof MetaEnumType)){
            let sym = expr.left._nsAccessedSymbol as DeclaredType;
            let enType = expr.left.inferredType.enumType.to(ctx, EnumType) as EnumType;
            return this.ir_generate_enum_access(expr, ctx, expr.right.name, sym, enType);
        }

        // check for deep class static field access
        if((expr.left instanceof MemberAccessExpression) && (expr.left.inferredType instanceof MetaClassType)){
            let classType = expr.left.inferredType.classType.to(ctx, ClassType) as ClassType;
            let attr = classType.getAttribute(expr.right.name);
            if(!attr || !attr?.isStatic){
                throw "Unreachable code";
            }
            let tmp = this.generateTmp();
            let inst = tmpType(expr.left.inferredType!);
            this.i(inst, tmp, "global", attr.uid);
            return tmp;
        }


        if(expr.left.inferredType instanceof NamespaceType){
            // in case the RHS is an element expression, we need to visit it
            if(expr._nsAccessedExpression){
                return this.visitElementExpression(expr._nsAccessedExpression, expr.left.inferredType.getContext());
            }
            return this.visitElementExpression(expr.right, expr.left.inferredType.getContext());
        }

        let lhsReg = this.visitExpression(expr.left, ctx);

        // now we check if we have a nullable access. if so we compare the lhs with null
        // if it is null we return null directly
        //

        let assignNullLabel: string = ""; // empty for now
        let endLabel: string = "";
        if(expr.isNullable){
            assignNullLabel = this.generateLabel();
            endLabel = this.generateLabel();
            this.i("j_eq_null_ptr", lhsReg, assignNullLabel)
        }


        let rhs = expr.right as ElementExpression;

        let baseType = expr.left.inferredType!.dereference();
        if(baseType.is(ctx, NullableType)){
            baseType = baseType?.denull()
        }

        let resultTMP = ""

        if (baseType.is(ctx, ArrayType)) {
            // an array can have two types of members: length and extend
            if (rhs.name == "length") {
                let tmp = this.generateTmp();
                this.i("debug", "array length expression");
                this.i("a_len", tmp, lhsReg);
                this.destroyTmp(lhsReg);
                resultTMP = tmp;
            } else if (rhs.name == "extend") {
                throw new Error("Shouldn't be here");
            } else {
                throw new Error("Unknown array member " + rhs.name);
            }
        }

        else if (baseType.is(ctx, CoroutineType)) {
            if (rhs.name === "state") {
                let tmp = this.generateTmp();
                this.i("coroutine_get_state", tmp, lhsReg);
                this.destroyTmp(lhsReg);
                resultTMP = tmp;
            }
            else if (rhs.name === "alive") {
                // replace with coroutine.state != 3
                let tmpCoState = this.generateTmp();
                resultTMP = this.generateTmp();
                let tmpValue = this.generateTmp();


                let jmpSuccess = this.generateLabel();
                // load state
                this.i("coroutine_get_state", tmpCoState, lhsReg);
                // assume false
                this.i("const_u8", resultTMP, 1);
                this.i("const_u8", tmpValue, 3);
                // co state != 3, so we make sure it is not equal to 3
                this.i("j_cmp_u8", tmpCoState, tmpValue, 1, jmpSuccess);
                this.i("const_u8", resultTMP, 0);
                this.i("label", jmpSuccess);

                this.destroyTmp(tmpCoState);
                this.destroyTmp(tmpValue);
                this.destroyTmp(lhsReg);
            }
            else {
                throw new Error("Unknown coroutine member " + rhs.name);
            }
        } else if (baseType.is(ctx, StructType)) {
            let structType = baseType.to(ctx, StructType) as StructType;
            let fieldType = structType.getFieldTypeByName(rhs.name);
            let field = structType.getField(rhs.name);

            let tmp = this.generateTmp();
            let instr = structGetFieldType(fieldType!);

            this.i(instr, tmp, lhsReg, field!.getFieldID());
            this.destroyTmp(lhsReg);
            resultTMP = tmp;
        } else if (baseType.is(ctx, PartialStructType)) {
            let partialStructType = baseType.to(ctx, PartialStructType) as PartialStructType;
            let structType = partialStructType.structType.to(ctx, StructType) as StructType;
            let fieldType = structType.getFieldTypeByName(rhs.name);
            let field = structType.getField(rhs.name);

            let tmp = this.generateTmp();
            let instr = structGetFieldJmpType(fieldType!);
            let lbl = this.getCoalescingLabel();
            if(!lbl){
                throw new Error("No coalescing label found");
            }

            this.i(instr, tmp, lhsReg, field!.getFieldID(), lbl);
            this.destroyTmp(lhsReg);
            resultTMP = tmp;
        } else if (baseType.is(ctx, ClassType)) {
            // find if the field is an attribute or a method
            let classType = baseType.to(ctx, ClassType) as ClassType;
            let attr = classType.getAttribute(rhs.name);
            if (attr != null) {
                let instr = classGetFieldType(attr.type);
                let tmp = this.generateTmp();
                let fieldIndex = classType.getAttributeIndex(rhs.name)!;
                this.i(instr, tmp, lhsReg, fieldIndex);
                this.destroyTmp(lhsReg);
                resultTMP = tmp;
            } else {
                throw new Error("Unknown class member " + rhs.name);
            }
        } else if (baseType.is(ctx, VariantConstructorType)) {
            // variant constructor
            this.i("debug", `variant constructor parameter access ${rhs.name}`);
            let variantType = baseType.to(ctx, VariantConstructorType) as VariantConstructorType;
            let parameterIndex = variantType.getParameterIndex(rhs.name);
            let param = variantType.parameters[parameterIndex];
            if (parameterIndex == -1) {
                throw new Error("Unknown parameter " + rhs.name);
            }

            let parameterType = variantType.getParameterType(parameterIndex);

            let tmp = this.generateTmp();
            let instr = structGetFieldType(parameterType);
            this.i(instr, tmp, lhsReg, param.getFieldID());
            this.destroyTmp(lhsReg);
            resultTMP = tmp;
        }
        else {
            throw new Error(
                "Unreachable, please report this bug",
            );
        }

        if(expr.isNullable){
            this.i("j", endLabel)
            this.i("label", assignNullLabel);
            this.i("const_ptr", resultTMP, 0);
            let lbl = this.getCoalescingLabel();
            if(lbl){
                this.i("j", lbl);
            }
            this.i("label", endLabel);
        }

        return resultTMP;
    }

    visitThisExpression(expr: ThisExpression, ctx: Context): string {
        // this could be an argument, or possibly an upvalue!
        let tmp = this.generateTmp();
        this.i("debug", "this expression");
        this.i("tmp_ptr", tmp, "arg", "$this");
        return tmp;
    }

    visitBinaryExpression(expr: BinaryExpression, ctx: Context): string {
        if (expr.operatorOverloadState.isMethodCall) {
            return this.ir_generate_binary_expr_method_call(expr, ctx);
        }

        // add debug info
        this.i("debug", "binary expression " + expr.operator);

        if(expr.operator == "&&"){
            return this.ir_generate_binary_expr_and(expr, ctx);
        }
        else if (expr.operator == "||"){
            return this.ir_generate_binary_expr_or(expr, ctx);
        }

        else if (expr.operator == "=") {
            return this.ir_generate_assignment(expr, ctx);
        } else if (["+=", "-=", "*=", "/=", "%="].includes(expr.operator)) {
            // generate the instruction
            let newInstruction = this.buildOpAssignBinaryExpr(
                ctx,
                expr.left,
                expr.right,
                (expr.operator as string)[0] as BinaryExpressionOperator,
                expr.inferredType!,
            );
            return this.visitExpression(newInstruction, ctx);
        }
        if (expr.operator === "??") {
            return this.ir_generate_null_coalescing(ctx, expr);
        }

        if(["<<", ">>"].includes(expr.operator) && (expr.inferredType!.is(ctx, PartialStructType) || expr.inferredType!.is(ctx, StructType))){
            return this.ir_generate_struct_merge(expr, ctx);
        }

        if (
            !(expr.inferredType instanceof BasicType) &&
            !(expr.inferredType instanceof BooleanType)
        ) {
            ctx.parser.customError(
                "Binary operation " +
                    expr.operator +
                    " is not yet implemented for " +
                    expr.inferredType?.getShortName(),
                expr.location,
            );
        }


        if(
            (expr.operator == "==" || expr.operator == "!=") && 
            (isStringClass(ctx, expr.left.inferredType!)) && 
            (!expr.left.inferredType!.is(ctx, NullableType)) && 
            (!expr.left.inferredType!.is(ctx, NullType)) &&
            (!expr.right.inferredType!.is(ctx, NullableType)) &&
            (!expr.right.inferredType!.is(ctx, NullType))
        ) {
            // special case for string enum
            // replace == with lhs.eq(rhs) and  != with !lhs.eq(rhs)
            if(expr.operator == "=="){
                const fnCall = convertStringEq(ctx, expr.left, expr.right);
                return this.visitExpression(fnCall, ctx);
            }
            else {
                const fnCall = convertStringNotEq(ctx, expr.left, expr.right);
                return this.visitExpression(fnCall, ctx);
            }
        }

        // generate the left expression
        this.i("debug", "lhs of binary expression " + expr.operator);
        let left = this.visitExpression(expr.left, ctx);

        if(expr.right instanceof NullLiteralExpression){
            if(expr.operator == "=="){
                let tmp = this.generateTmp();
                let instruction = jCmpNullType(expr.left.inferredType!);
                // assume null
                this.i("const_u8", tmp, 1);
                let isNullLabel = this.generateLabel();
                this.i(instruction, left, isNullLabel);
                // assume not null
                this.i("const_u8", tmp, 0);
                this.i("label", isNullLabel);
                return tmp;
            }
            else if (expr.operator == "!=") {
                let tmp = this.generateTmp();
                // !=
                let instruction = jCmpNullType(expr.left.inferredType!);
                // assume null
                this.i("const_u8", tmp, 0);
                let isNullLabel = this.generateLabel();
                this.i(instruction, left, isNullLabel);
                // assume not null
                this.i("const_u8", tmp, 1);
                this.i("label", isNullLabel);
                return tmp;
            }
        }


        /* TODO: speed up the case where we are comparing to null
        if((expr.right instanceof NullLiteralExpression) && (expr.operator == "==")){
            // special case for null comparison

        }
        */

        // generate the right expression
        this.i("debug", "rhs of binary expression " + expr.operator);
        let right = this.visitExpression(expr.right, ctx);

        if (
            expr.operator == "==" ||
            expr.operator == "!=" ||
            expr.operator == "<" ||
            expr.operator == ">" ||
            expr.operator == "<=" ||
            expr.operator == ">="
        ) {
            return this.ir_generate_comparison(expr, ctx, left, right);
        } else {
            let inst = getBinaryInstruction(
                expr.inferredType!,
                expr.operator,
            );
            let tmp = this.generateTmp();
            this.i(inst, tmp, left, right);
            this.destroyTmp(left);
            this.destroyTmp(right);
            return tmp;
        }
    }

    ir_generate_comparison(
        expr: BinaryExpression,
        ctx: Context,
        left: string,
        right: string,
    ) {
        this.i("debug", "generating comparaison expression " + expr.operator);
        // result will be either 0 or 1
        let tmp = this.generateTmp();
        // first we cmp

        // for comparaison we use the hint type if present
        let inferredType = expr.promotedType;
        let cmp: IRInstructionType = "j_cmp_u8";
        if (
            inferredType?.is(ctx, BasicType) || 
            inferredType?.is(ctx, EnumType) ||
            inferredType?.is(ctx, BooleanType)
        ) {
            let basic_type: BasicType;
            if (inferredType.is(ctx, EnumType)) {
                basic_type = (inferredType.to(ctx, BasicType) as BasicType);
            }
            else {
                basic_type = inferredType as BasicType;
            }
            cmp = getBinaryInstruction(basic_type, expr.operator);
        } else {
            // make sure that the operator is == or !=
            if (expr.operator != "==" && expr.operator != "!=") {
                ctx.parser.customError(
                    "Cannot compare " +
                        expr.left.inferredType?.kind +
                        " with " +
                        expr.right.inferredType?.kind,
                    expr.location,
                );
            }

            cmp = "j_cmp_ptr";
        }

        // now we need three labels for the jumps
        // end label, if true, it needs to skip the false label
        let lblEnd = this.generateLabel();

        // if the condition is true, jump to the true label
        this.i("debug", "conditional jump");

        // assume true
        this.i("const_u8", tmp, 1);
        if (expr.operator == "==") {
            this.i(cmp, left, right, 0, lblEnd);
        } else if (expr.operator == "!=") {
            this.i(cmp, left, right, 1, lblEnd);
        } else if (expr.operator == "<") {
            this.i(cmp, left, right, 4, lblEnd);
        } else if (expr.operator == ">") {
            this.i(cmp, left, right, 2, lblEnd);
        } else if (expr.operator == "<=") {
            this.i(cmp, left, right, 5, lblEnd);
        } else if (expr.operator == ">=") {
            this.i(cmp, left, right, 3, lblEnd);
        } else {
            throw new Error("Unknown operator " + expr.operator);
        }

        this.destroyTmp(left);
        this.destroyTmp(right);


        // true label
        this.i("debug", "false label");
        this.i("const_u8", tmp, 0);

        // no need to jump to the end, it will continue
        // end label
        this.i("debug", "end label");
        this.i("label", lblEnd);
        return tmp;
    }

    ir_generate_binary_expr_and(expr: BinaryExpression, ctx: Context) {
        // for and, if the LHS is false, we can skip the RHS

        this.i("debug", "generating and expression");
        let lblFalse = this.generateLabel();
        let resTmp = this.generateTmp();

        // assume false
        this.i("const_u8", resTmp, 0);
        let lhsTmp = this.visitExpression(expr.left, ctx);
        this.i("j_eq_null_u8", lhsTmp, lblFalse);


        let tmp2 = this.visitExpression(expr.right, ctx);
        this.i("j_eq_null_u8", tmp2, lblFalse);

        this.i("const_u8", resTmp, 1);
        this.i("label", lblFalse);

        return resTmp;
    }

    ir_generate_binary_expr_or(expr: BinaryExpression, ctx: Context) {
        // Generate labels for true and false
        let lblTrue = this.generateLabel();
        let lblEnd = this.generateLabel();
        let resTmp = this.generateTmp();
        let lblContinue = this.generateLabel();
    
        // Assume result is false
        this.i("const_u8", resTmp, 0);
    
        // Evaluate LHS
        let lhsTmp = this.visitExpression(expr.left, ctx);
        this.i("j_eq_null_u8", lhsTmp, lblContinue); // If LHS is null, evaluate RHS
        this.i("j", lblTrue);                    // Otherwise, short-circuit to true
    
        // Evaluate RHS
        this.i("label", lblContinue);
        let rhsTmp = this.visitExpression(expr.right, ctx);
        this.i("j_eq_null_u8", rhsTmp, lblEnd);     // If RHS is null, result remains false
        this.i("j", lblTrue);                    // Otherwise, jump to true
    
        // Set result to true
        this.i("label", lblTrue);
        this.i("const_u8", resTmp, 1);
    
        // End
        this.i("label", lblEnd);
    
        return resTmp;
    }
    

    ir_generate_assignment(expr: BinaryExpression, ctx: Context) {
        if (expr.left instanceof TupleConstructionExpression) {
            this.ir_generate_tuple_assignment(ctx, expr);
            return "";
        }

        // generate the right expression
        let right = this.visitExpression(expr.right, ctx);

        if (isUpvalueVariable(expr.left, ctx)) {
            return this.ir_generate_upvalue_assignment(expr, ctx, right);
        }
        if (isLocalVariable(expr.left, ctx)) {
            return this.ir_generate_local_variable_assignment(expr, ctx, right);
        }
        if (isGlobalVariable(expr.left, ctx)) {
            this.i("debug", "global variable assignment");
            let sym = ctx.lookup((expr.left as ElementExpression).name);
            // global variable
            let inst = globalType(expr.left.inferredType!);
            this.i(inst, sym!.uid, right);
            return right;
        }
        if (isFunctionArgument(expr.left, ctx)) {
            return this.ir_generate_function_argument_assignment(
                expr,
                ctx,
                right,
            );
        }
        if (expr.left instanceof MemberAccessExpression) {
            // check if it is struct
            let left = expr.left as MemberAccessExpression;
            let element = left.right as ElementExpression;

            let baseType = left.left.inferredType!;

            let nullableAccess = left.isNullable;
            // we might have a nullable type here
            if(left.isNullable){
                baseType = baseType.denull();
            }

            if (baseType.is(ctx, StructType)) {
                return this.ir_generate_struct_field_assignment(
                    expr,
                    ctx,
                    left,
                    right,
                    baseType.to(ctx, StructType) as StructType,
                    element,
                    nullableAccess,
                );
            } else if (baseType.is(ctx, PartialStructType)) {
                return this.ir_generate_struct_field_assignment(
                    expr,
                    ctx,
                    left,
                    right,
                    (baseType.to(ctx, PartialStructType) as PartialStructType).structType.to(ctx, StructType) as StructType,
                    element,
                    nullableAccess,
                );
            }else if (baseType.is(ctx, VariantConstructorType)) {
                return this.ir_generate_variant_constructor_field_assignment(
                    expr,
                    ctx,
                    left,
                    right,
                    baseType.to(ctx, VariantConstructorType) as VariantConstructorType,
                    element,
                    nullableAccess,
                );
            } else if (baseType.is(ctx, ClassType)) {
                return this.ir_generate_class_field_assignment(
                    expr,
                    ctx,
                    left,
                    right,
                    baseType.to(ctx, ClassType) as ClassType,
                    element,
                    nullableAccess,
                );
            }
            else if (baseType.is(ctx, MetaClassType)) {
                // class static field access
                // we treat as a global variable
                let metaClass = baseType.to(ctx, MetaClassType) as MetaClassType;
                let attr = metaClass.classType.getAttribute(element.name);

                if(!attr || !attr?.isStatic){
                    throw "Unreachable code";
                }
                
                    // global variable
                let inst = globalType(expr.left.inferredType!);
                this.i(inst, attr!.uid, right);
                return right;
            }
            else {
                console.log(baseType.getShortName());
            }
        }
        {
            this.i("debug", "assignment of " + expr.left.kind);
            throw new Error(
                "Assignment to " + expr.left.kind + " is not yet implemented",
            );
        }
    }

    ir_generate_class_field_assignment(
        expr: BinaryExpression,
        ctx: Context,
        left: MemberAccessExpression,
        right: string,
        baseType: ClassType,
        element: ElementExpression,
        nullableAccess: boolean,
    ) {
        let classType = baseType as ClassType;
        // we will assign the value to the class's field
        this.i("debug", "class field assignment, class expression");
        let classExpr = this.visitExpression(left.left, ctx);
        this.i("debug", "class field assignment, class member " + element.name);
        let attr = classType.getAttribute(element.name);


        let endLabel = ""
        let assignNullLabel = ""
        // check if the field is null
        if(nullableAccess){
            endLabel = this.generateLabel();
            assignNullLabel = this.generateLabel();
            this.i("j_eq_null_ptr", classExpr, assignNullLabel);
        }


        if (attr == null) {
            ctx.parser.customError(
                "Can only assign to class attributes",
                element.location,
            );
        }

        let fieldType = attr.type;
        let fieldIndex = classType.getAttributeIndex(element.name)!;

        let instr = classSetFieldType(fieldType);
        this.i(instr, classExpr, fieldIndex, right);
        this.destroyTmp(classExpr);

        if(nullableAccess){
            this.i("j", endLabel);
            this.i("label", assignNullLabel);
            this.i("const_ptr", right, 0);
            let lbl = this.getCoalescingLabel();
            if(lbl){
                this.i("j", lbl);
            }
            this.i("label", endLabel);
        }

        return right;
    }

    ir_generate_struct_field_assignment(
        expr: BinaryExpression,
        ctx: Context,
        left: MemberAccessExpression,
        right: string,
        baseType: StructType,
        element: ElementExpression,
        nullableAccess: boolean,
    ) {
        let structType = baseType as StructType;
        // we will assign the value to the struct's field
        this.i("debug", "struct field assignment, struct expression");
        let structExpr = this.visitExpression(left.left, ctx);
        this.i(
            "debug",
            "struct field assignment, struct member " + element.name,
        );

        let endLabel = ""
        let assignNullLabel = ""
        // check if the field is null
        if(nullableAccess){
            endLabel = this.generateLabel();
            assignNullLabel = this.generateLabel();
            this.i("j_eq_null_ptr", structExpr, assignNullLabel);
        }



        let fieldType = structType.getFieldTypeByName(element.name)!;
        let field = structType.getField(element.name);

        let instr = structSetFieldType(fieldType);
        this.i(instr, structExpr, field!.getFieldID(), right);
        this.destroyTmp(structExpr);
        //this.i("s_set_field_f32", "struct field assignment, struct member");

        if(nullableAccess){
            this.i("j", endLabel);
            this.i("label", assignNullLabel);
            this.i("const_ptr", right, 0);
            let lbl = this.getCoalescingLabel();
            if(lbl){
                this.i("j", lbl);
            }
            this.i("label", endLabel);
        }
        return right;
    }


    ir_generate_variant_constructor_field_assignment(
        expr: BinaryExpression,
        ctx: Context,
        left: MemberAccessExpression,
        right: string,
        baseType: VariantConstructorType,
        element: ElementExpression,
        nullableAccess: boolean,
    ) {
        let variantType = baseType as VariantConstructorType;
        // we will assign the value to the struct's field
        this.i("debug", "struct field assignment, struct expression");
        let variantExpr = this.visitExpression(left.left, ctx);
        this.i(
            "debug",
            "struct field assignment, struct member " + element.name,
        );

        let endLabel = ""
        let assignNullLabel = ""
        // check if the field is null
        if(nullableAccess){
            endLabel = this.generateLabel();
            assignNullLabel = this.generateLabel();
            this.i("j_eq_null_ptr", variantExpr, assignNullLabel);
        }


        // now we need to get the variant ID
        let variantID = variantType.getId();

        let parameters = VariantParameter.sortParameters([...variantType.parameters], expr.location);

  
        const field = parameters.find(x => x.name == element.name)!;


        let instr = structSetFieldType(field?.type);
        this.i(instr, variantExpr, field!.getFieldID(), right);
        this.destroyTmp(variantExpr);

        if(nullableAccess){
            this.i("j", endLabel);
            this.i("label", assignNullLabel);
            this.i("const_ptr", right, 0);
            let lbl = this.getCoalescingLabel();
            if(lbl){
                this.i("j", lbl);
            }
            this.i("label", endLabel);
        }
        return right;
    }

    ir_generate_function_argument_assignment(
        expr: BinaryExpression,
        ctx: Context,
        right: string,
    ) {
        // arguments needs to be handled differently
        // arg_u32 x tmp_0 needs to be become:
        // 1. tmp_u32 tmp_1, x
        // 2. tmp_u32 tmp_2, "tmp", tmp_0

        this.i("debug", "function argument assignment");
        let sym = ctx.lookup((expr.left as ElementExpression).name);
        // function argument
        let inst = tmpType(expr.left.inferredType!);
        let tmp = this.generateTmp();
        this.i(inst, tmp, "arg", sym!.uid);
        this.i(inst, tmp, "reg", right);

        //this.i(inst, sym!.uid, right);
        return right;
    }

    ir_generate_upvalue_assignment(
        expr: BinaryExpression,
        ctx: Context,
        right: string,
    ) {
        let sym = ctx.lookupScope((expr.left as ElementExpression).name);
        this.i("debug", "upvalue variable assignment, treated as arg");
        let inst = tmpType(expr.left.inferredType!);
        let tmp = this.generateTmp();
        this.i(inst, tmp, "arg", sym!.sym.uid);
        this.i(inst, tmp, "reg", right);
        return right;
    }

    ir_generate_local_variable_assignment(
        expr: BinaryExpression,
        ctx: Context,
        right: string,
    ) {
        this.i("debug", "local variable assignment");
        let sym = ctx.lookupScope((expr.left as ElementExpression).name);
        // local variable
        if (this.isGlobal) {
            let inst = globalType(expr.left.inferredType!);
            this.i(inst, sym!.sym.uid, right);
        } else {
            let inst = tmpType(expr.left.inferredType!);
            let tmp = this.generateTmp();
            this.i(inst, tmp, sym!.scope, sym!.sym.uid);
            this.i(inst, tmp, "reg", right);
        }
        return right;
    }

    ir_generate_binary_expr_method_call(expr: BinaryExpression, ctx: Context) {
        // method call is as follows:
        // a + b -> a.add(b)
        this.i("debug", "replacing binary expression with method call");
        let methodCall = new FunctionCallExpression(
            expr.location,
            new MemberAccessExpression(
                expr.location,
                expr.left,
                new ElementExpression(
                    expr.location,
                    expr.operatorOverloadState.methodRef!.name,
                ),
            ),
            [expr.right],
        );
        methodCall.infer(ctx, expr.inferredType, {isWithinNullishCoalescing: true});
        return this.visitFunctionCallExpression(methodCall, ctx);
    }

    visitFunctionCallExpression(
        expr: FunctionCallExpression,
        ctx: Context,
    ): string {
        this.i("debug", "Function call expression");
        let lhsType = expr.lhs.inferredType!;
        // case 1: direct function call
        if (
            lhsType instanceof FunctionType &&
            expr.lhs instanceof ElementExpression
        ) {
            return this.ir_generate_direct_function_call(expr, ctx, lhsType);
        }

        // case 2: method/class method class x.f()
        else if (
            lhsType instanceof FunctionType &&
            expr.lhs instanceof MemberAccessExpression
        ) {
            // make sure it is a class method
            let baseExpression = expr.lhs as MemberAccessExpression;
            let baseType = baseExpression.left.inferredType!;

            if(baseType.is(ctx, NullableType)){
                if(expr._isNullableCall) {
                    baseType = baseType.denull();
                }
                else {
                    throw "Unreachable code";
                }
            }

            if (baseType.is(ctx,ClassType)) {
                let classType = (baseType.to(ctx, ClassType)) as ClassType;
                classType.buildAllMethods();

                let accessElement = (baseExpression.right as ElementExpression)
                    .name;

                // nowe we have to guess if it is a method or an attribute
                let attr = classType.getAttribute(accessElement);

                if (attr != null) {
                    this.i("debug", `class attribute call ${accessElement}`);
                    return this.ir_generate_class_attribute_call(
                        expr,
                        ctx,
                        baseExpression,
                        classType,
                        accessElement,
                    );
                } else {
                    return this.ir_generate_class_method_call(
                        expr,
                        ctx,
                        baseExpression,
                        accessElement,
                        lhsType,
                    );
                }
            } else if (baseType?.is(ctx, InterfaceType)) {
                let accessElement = (expr.lhs.right as ElementExpression).name;
                return this.ir_generate_interface_method_call(
                    expr,
                    ctx,
                    baseExpression,
                    baseType.to(ctx, InterfaceType) as InterfaceType,
                    accessElement,
                );
            } else if (baseType instanceof ArrayType) {
                return this.ir_generate_array_method_call(
                    expr,
                    ctx,
                    baseExpression,
                    baseType,
                );
            } else if (baseType instanceof CoroutineType) {
                return this.ir_generate_coroutine_method_call(
                    expr,
                    ctx,
                    baseExpression,
                    baseType,
                );
            } else if (baseType instanceof MetaType) {
                if (baseType instanceof MetaClassType) {
                    // Class static method call
                    return this.ir_generate_class_static_method_call(
                        expr,
                        ctx,
                        baseExpression,
                        baseType.classType as ClassType,
                        lhsType,
                    );
                }
            }
        }
        // case 3: Method override of __call___ -> x(1, 2, 3) -> x.__call__(1, 2, 3)
        if (expr.operatorOverloadState.isMethodCall) {
            // we will have to generate a new function call expression
            this.i("debug", "replacing binary function call with method call");
            let methodCall = new FunctionCallExpression(
                expr.location,
                new MemberAccessExpression(
                    expr.location,
                    expr.lhs,
                    new ElementExpression(
                        expr.location,
                        expr.operatorOverloadState.methodRef!.name,
                    ),
                ),
                expr.args,
            );
            methodCall.infer(ctx, expr.inferredType);
            return this.visitFunctionCallExpression(methodCall, ctx);
        }
        // case 4: Variant Constructor
        if (
            lhsType instanceof MetaType &&
            lhsType instanceof MetaVariantConstructorType
        ) {
            return this.ir_generate_variant_constructor_call(
                expr,
                ctx,
                lhsType,
            );
        } else if (lhsType instanceof FFIMethodType) {
            return this.ir_generate_ffi_method_call(expr, ctx, lhsType);
        } else {
            // anonymous function call
            return this.ir_generate_anonymous_function_call(expr, ctx);
        }

        ctx.parser.customError("Invalid expression!", expr.location);
    }

    ir_generate_anonymous_function_call(
        expr: FunctionCallExpression,
        ctx: Context,
    ): string {
        let fnReg = this.visitExpression(expr.lhs, ctx);
        // an indirect call such as f()() or x[0](1)
        let instructions: IRInstructionType[] = [];
        let regs: string[] = [];

        // generate the arguments, backwards
        for (let i = 0; i < expr.args.length; i++) {
            let arg = expr.args[i];
            let tmp = this.visitExpression(arg, ctx);
            let pushArgInst = fnSetArgType(arg.inferredType!);

            instructions.push(pushArgInst);
            regs.push(tmp);
        }

        const isCoroutine = expr._isCoroutineCall;
        if (isCoroutine) {
            this.i("coroutine_fn_alloc", fnReg);
        } else {
            this.i("fn_alloc");
        }

        for (let i = 0; i < instructions.length; i++) {
            this.i(instructions[i], i, regs[i]);
            // mut regs not used for now..
            //if(!mutRegs.includes(regs[i])){
            this.destroyTmp(regs[i]);
            //}
        }

        // check if the function returns a value
        let hasReturn = true;
        if (
            expr.inferredType instanceof VoidType ||
            expr.inferredType instanceof TupleType
        ) {
            hasReturn = false;
        }

        if (isCoroutine) {
            if (hasReturn) {
                let tmp = this.generateTmp();
                this.i("coroutine_call", tmp, fnReg);
                this.destroyTmp(fnReg);
                return tmp;
            } else {
                this.i("coroutine_call", fnReg);
                this.destroyTmp(fnReg);
                return "";
            }
        } else {
            if (hasReturn) {
                let tmp = this.generateTmp();
                this.i("closure_call", fnReg);
                this.i(
                    getFnReturnType(expr.inferredType!),
                    tmp,
                    255,
                    getDataTypeByteSize(expr.inferredType!),
                );
                this.destroyTmp(fnReg);
                return tmp;
            } else {
                this.i("closure_call", fnReg);
                return "";
            }
        }
    }

    ir_generate_ffi_method_call(
        expr: FunctionCallExpression,
        ctx: Context,
        lhsType: FFIMethodType,
    ): string {
        let baseFFI = lhsType.parentFFI!;
        let ffi_id = baseFFI.ffiId;
        let method_id = baseFFI.getMethodIndex(lhsType.imethod.name);


        let instructions: IRInstructionType[] = [];
        let regs: string[] = [];

        for (let i = expr.args.length - 1; i >= 0; i--) {
            let arg = expr.args[i];
            let tmp = this.visitExpression(arg, ctx);
            let pushArgInst = pushStackType(arg.inferredType!);
            instructions.push(pushArgInst);
            regs.push(tmp);
        }

        for (let i = 0; i < instructions.length; i++) {
            this.i(instructions[i], regs[i]);
            this.destroyTmp(regs[i]);
        }

        let hasReturn = true;
        if (
            expr.inferredType instanceof VoidType ||
            expr.inferredType instanceof TupleType
        ) {
            hasReturn = false;
        }

        if (hasReturn) {
            let tmp = this.generateTmp();
            this.i("call_ffi", ffi_id, method_id);
            let pop = popStackType(expr.inferredType!);
            this.i(pop, tmp);
            return tmp;
        } else {
            this.i("call_ffi", ffi_id, method_id);
            return "";
        }
    }

    ir_generate_variant_constructor_call(
        expr: FunctionCallExpression,
        ctx: Context,
        lhsType: MetaVariantConstructorType,
    ): string {
        // variant constructor
        // first we need to get the variant type
        let variantType = expr.inferredType?.to(
            ctx,
            VariantConstructorType,
        ) as VariantConstructorType;

        // now we need to get the variant ID
        let variantID = variantType.getId();

        let parameters = VariantParameter.sortParameters([...variantType.parameters], expr.location);

        // each parameter maps to the index of the parameter in the variant constructor
        let parameterMapping = parameters.map((x) =>
            variantType.parameters.indexOf(x),
        );
        //console.log("Variant order: ",parameters.map(x => x.name + ': '+x.getFieldID()));
        // allocate the variant
        let variantReg = this.generateTmp();
        this.i("debug", "allocating variant");

        this.i(
            "s_alloc",
            variantReg,
            parameters.length,
            variantType.getStructSize(),
        );

        //console.log(parameters.map((x) => x.name + ': '+x.getFieldID()))
        for (let i = 0; i < parameters.length; i++) {
            let param = parameters[i];
            this.i("debug", `setting variant field offset ${param.name}`);
            //console.log(">    s_reg_field", variantReg, i+1, param.getFieldID(), argsOffset[i+1])
            this.i(
                "s_reg_field",
                variantReg,
                i,
                param.getFieldID(),
                variantType.getParameterOffset(i),
                isPointer(param.type) ? 1 : 0,
            );
        }

        this.i("debug", `setting variant field tag`);
        let variantIdReg = this.generateTmp();
        this.i("const_u16", variantIdReg, variantID);
        this.i("s_set_field_u16", variantReg, 0, variantIdReg);
        this.destroyTmp(variantIdReg);

        for (let i = 0; i < parameters.length; i++) {
            this.i("debug", `setting variant field ${parameters[i].name}`);
            let idx = parameterMapping[i];
            // tag  has been, it has no mapping
            if(idx == -1){
                continue;
            }
            let arg = this.visitExpression(expr.args[idx], ctx);
            let instr = structSetFieldType(parameters[i].type);
            this.i(instr, variantReg, parameters[i].getFieldID(), arg);
            this.destroyTmp(arg);
        }

        return variantReg;
    }
    ir_generate_class_static_method_call(
        expr: FunctionCallExpression,
        ctx: Context,
        baseExpression: MemberAccessExpression,
        baseType: ClassType,
        lhsType: FunctionType,
    ): string {
        let method = expr._calledClassMethod;
        if (method == null) {
            ctx.parser.customError(
                "Unknown method " +
                    (baseExpression.right as ElementExpression).name,
                lhsType.location,
            );
        }

        this.i("debug", `static class method call ${method.name}`);

        let instructions: IRInstructionType[] = [];
        let regs: string[] = [];

        // generate the arguments, backwards
        for (let i = 0; i < expr.args.length; i++) {
            let arg = expr.args[i];
            let tmp = this.visitExpression(arg, ctx);
            let pushArgInst = fnSetArgType(arg.inferredType!);
            instructions.push(pushArgInst);
            regs.push(tmp);
        }

        this.i("fn_alloc");

        for (let i = 0; i < instructions.length; i++) {
            this.i(instructions[i], i, regs[i]);
            this.destroyTmp(regs[i]);
        }

        let hasReturn = true;
        if (
            expr.inferredType instanceof VoidType ||
            expr.inferredType instanceof TupleType
        ) {
            hasReturn = false;
        }

        if (hasReturn) {
            let tmp = this.generateTmp();
            this.i("call", method.context.uuid);
            this.i(
                getFnReturnType(expr.inferredType!),
                tmp,
                255,
                getDataTypeByteSize(expr.inferredType!),
            );
            return tmp;
        } else {
            this.i("call", method.context.uuid);
            return "";
        }
    }

    ir_generate_array_method_call(
        expr: FunctionCallExpression,
        ctx: Context,
        baseExpression: MemberAccessExpression,
        baseType: ArrayType,
    ): string {
        if (!(expr.lhs instanceof MemberAccessExpression)) {
            ctx.parser.customError("Invalid expression!", expr.location);
        }
        // check if array extend method
        if ((expr.lhs.right as ElementExpression).name == "extend") {
            let arrayReg = this.visitExpression(baseExpression.left, ctx);
            let new_size = this.visitExpression(expr.args[0], ctx);
            this.i("a_extend", arrayReg, new_size);
            this.destroyTmp(arrayReg);
            this.destroyTmp(new_size);

            return "";
        } else if ((expr.lhs.right as ElementExpression).name == "slice") {
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

        ctx.parser.customError("Invalid expression!", expr.location);
    }

    ir_generate_coroutine_method_call(
        expr: FunctionCallExpression,
        ctx: Context,
        baseExpression: MemberAccessExpression,
        baseType: CoroutineType,
    ): string {

        if(!(expr.lhs instanceof MemberAccessExpression)){
            ctx.parser.customError("Invalid expression!", expr.location);
        }

        let coroutineReg = this.visitExpression(baseExpression.left, ctx);

        if ((expr.lhs.right as ElementExpression).name == "reset") {
            this.i("coroutine_reset", coroutineReg);
            this.destroyTmp(coroutineReg);

            return "";
        } 
        else if ((expr.lhs.right as ElementExpression).name == "finish") {
            this.i("coroutine_finish", coroutineReg);
            this.destroyTmp(coroutineReg);

            return "";
        }
        
        ctx.parser.customError("Invalid expression!", expr.location);
    }

    ir_generate_interface_method_call(
        expr: FunctionCallExpression,
        ctx: Context,
        baseExpression: MemberAccessExpression,
        baseType: InterfaceType,
        accessElement: string,
    ) {
        // interface, must be a method
        this.i("debug", "interface method call");
        let interfaceType = baseType.to(ctx, InterfaceType) as InterfaceType;

        if (expr._calledInterfaceMethod == null) {
            throw new Error("Method not found in cache");
        }

        let method = expr._calledInterfaceMethod;

        let isStatic = method?.isStatic;

        this.i("debug", "interface expression");
        // now we need to get the interface pointer
        let interfacePointer = this.visitExpression(baseExpression.left, ctx);

        let endLabel = ""
        let assignNullLabel = ""

        if(expr._isNullableCall){
            endLabel = this.generateLabel();
            assignNullLabel = this.generateLabel();
            this.i("j_eq_null_ptr", interfacePointer, assignNullLabel);
        }


        this.i("debug", "method address of " + method.name);
        // now we need to get the method
        let methodReg = this.generateTmp();

        this.i("c_load_m", methodReg, interfacePointer, method.getUID());

        this.i("debug", "set up args");

        let instructions: IRInstructionType[] = [];
        let regs: string[] = [];

        // generate the arguments, backwards
        for (let i = 0; i < expr.args.length; i++) {
            let arg = expr.args[i];
            let tmp = this.visitExpression(arg, ctx);
            let pushArgInst = fnSetArgType(arg.inferredType!);
            instructions.push(pushArgInst);
            regs.push(tmp);
        }

        this.i("fn_alloc");

        if (!isStatic) {
            // get class
            let classReg = this.generateTmp();
            // push the base object into the stack as parameter
            this.i("fn_set_reg_ptr", 0, interfacePointer);
            this.destroyTmp(classReg);
        }
        this.destroyTmp(interfacePointer);

        for (let i = 0; i < instructions.length; i++) {
            this.i(instructions[i], i + (isStatic ? 0 : 1), regs[i]);
            this.destroyTmp(regs[i]);
        }

        let hasReturn = true;
        if (
            expr.inferredType instanceof VoidType ||
            expr.inferredType instanceof TupleType
        ) {
            hasReturn = false;
        }

        let resultTMP = ""
        if (hasReturn) {
            let tmp = this.generateTmp();
            this.i("call_ptr", tmp, methodReg);
            this.destroyTmp(methodReg);
            resultTMP = tmp;
        } else {
            this.i("call_ptr", methodReg);
            this.destroyTmp(methodReg);
            resultTMP = ""
        }

        if(expr._isNullableCall){
            this.i("j", endLabel);
            this.i("label", assignNullLabel);
            this.i("const_ptr", resultTMP, 0);
            let lbl = this.getCoalescingLabel();
            if(lbl){
                this.i("j", lbl);
            }
            this.i("label", endLabel);
        }

        return resultTMP;
    }

    ir_generate_class_method_call(
        expr: FunctionCallExpression,
        ctx: Context,
        baseExpression: MemberAccessExpression,
        accessElement: string,
        lhsType: FunctionType,
    ): string {
        // gotta be a method
        // check if it is static or not

        if (!(expr.lhs instanceof MemberAccessExpression)) {
            ctx.parser.customError("Invalid expression!", expr.location);
        }

        let class_pointer_reg = this.visitExpression(baseExpression.left, ctx);

        let assignNullLabel = ""
        let endLabel = ""
        if(expr._isNullableCall){
            endLabel = this.generateLabel();
            assignNullLabel = this.generateLabel();
            this.i("j_eq_null_ptr", class_pointer_reg, assignNullLabel);
        }

        // now generate the instruction to get the method
        let methodReg = this.generateTmp();

        let method: InterfaceMethod | null = null;

        // make sure the cached method is not null
        if (expr._calledClassMethod == null) {
            throw new Error("Method not found in cache");
        }
        // if the method is generic, we need to use the concrete method
        method = expr._calledClassMethod!.imethod;

        let isStatic = method?.isStatic;
        if (method == null) {
            ctx.parser.customError(
                "Unknown method " + accessElement,
                lhsType.location,
            );
        }

        this.i("debug", `class method call ${method.name}`);
        this.i("c_load_m", methodReg, class_pointer_reg, method.getUID());

        let instructions: IRInstructionType[] = [];
        let regs: string[] = [];

        // generate the arguments, backwards
        for (let i = 0; i < expr.args.length; i++) {
            let arg = expr.args[i];
            let tmp = this.visitExpression(arg, ctx);
            let pushArgInst = fnSetArgType(arg.inferredType!);
            instructions.push(pushArgInst);
            regs.push(tmp);
        }

        this.i("fn_alloc");

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
        if (
            expr.inferredType instanceof VoidType ||
            expr.inferredType instanceof TupleType
        ) {
            hasReturn = false;
        }

        let resultTMP = ""

        if (hasReturn) {
            let tmp = this.generateTmp();
            this.i("call_ptr", tmp, methodReg);
            this.destroyTmp(methodReg);
            resultTMP = tmp;
        } else {
            this.i("call_ptr", methodReg);
            this.destroyTmp(methodReg);
            resultTMP = ""
        }

        if(expr._isNullableCall){
            this.i("j", endLabel);
            this.i("label", assignNullLabel);
            if(!hasReturn){
                resultTMP = this.generateTmp();
            }
            this.i("const_ptr", resultTMP, 0);
            let lbl = this.getCoalescingLabel();
            if(lbl){
                this.i("j", lbl);
            }
            this.i("label", endLabel);
        }

        return resultTMP;
    }

    ir_generate_class_attribute_call(
        expr: FunctionCallExpression,
        ctx: Context,
        baseExpression: MemberAccessExpression,
        baseType: ClassType,
        accessElement: string,
    ): string {
        // it is an attribute, we get the proceed normally
        let reg = this.visitExpression(expr.lhs, ctx);

        let endLabel = ""
        let assignNullLabel = ""
        if(expr._isNullableCall){
            endLabel = this.generateLabel();
            assignNullLabel = this.generateLabel();
            this.i("j_eq_null_ptr", reg, assignNullLabel);
        }

        let instructions: IRInstructionType[] = [];
        let regs: string[] = [];

        // generate the arguments, backwards
        for (let i = 0; i < expr.args.length; i++) {
            let arg = expr.args[i];
            let tmp = this.visitExpression(arg, ctx);
            let pushArgInst = fnSetArgType(arg.inferredType!);
            instructions.push(pushArgInst);
            regs.push(tmp);
        }

        const isCoroutine = expr._isCoroutineCall;
        if (isCoroutine) {
            this.i("coroutine_fn_alloc", reg);
        } else {
            this.i("fn_alloc");
        }

        for (let i = 0; i < instructions.length; i++) {
            this.i(instructions[i], i, regs[i]);
            this.destroyTmp(regs[i]);
        }

        let hasReturn = true;
        if (
            expr.inferredType instanceof VoidType ||
            expr.inferredType instanceof TupleType
        ) {
            hasReturn = false;
        }

        let resultTMP = ""

        if (isCoroutine) {
            if (hasReturn) {
                let tmp = this.generateTmp();
                this.i("coroutine_call", tmp, reg);
                this.destroyTmp(reg);
                resultTMP = tmp;
            } else {
                this.i("coroutine_call", reg);
                this.destroyTmp(reg);
                resultTMP = ""
            }
        } else {
            if (hasReturn) {
                let tmp = this.generateTmp();
                this.i("closure_call", reg);
                this.i(
                    getFnReturnType(expr.inferredType!),
                    tmp,
                    255,
                    getDataTypeByteSize(expr.inferredType!),
                );
                this.destroyTmp(reg);
                resultTMP = tmp;
            } else {
                this.i("closure_call", reg);
                this.destroyTmp(reg);
                resultTMP = ""
            }
        }

        if(expr._isNullableCall){
            this.i("j", endLabel);
            this.i("label", assignNullLabel);
            this.i("const_ptr", resultTMP, 0);
            let lbl = this.getCoalescingLabel();
            if(lbl){
                this.i("j", lbl);
            }
            this.i("label", endLabel);
        }

        return resultTMP;
    }

    ir_generate_direct_function_call(
        expr: FunctionCallExpression,
        ctx: Context,
        lhsType: FunctionType,
    ): string {
        if (!(expr.lhs instanceof ElementExpression)) {
            ctx.parser.customError("Invalid expression!", expr.location);
        }

        let sym = expr.lhs._scopedVar!.sym;

        let instructions: IRInstructionType[] = [];
        let regs: string[] = [];

        // generate the arguments, backwards
        for (let i = 0; i < expr.args.length; i++) {
            let arg = expr.args[i];
            let tmp = this.visitExpression(arg, ctx);
            let pushArgInst = fnSetArgType(arg.inferredType!);

            instructions.push(pushArgInst);
            regs.push(tmp);
        }

        this.i("fn_alloc");
        for (let i = 0; i < instructions.length; i++) {
            this.i(instructions[i], i, regs[i]);
            this.destroyTmp(regs[i]);
        }

        if (sym instanceof DeclaredFunction) {
            let decl = expr.lhs._functionReference;
            if (decl == null) {
                throw new Error(
                    "UNREACHABLE:Unknown function " + expr.lhs.name,
                );
            }

            // check if the function returns a value
            let hasReturn = true;
            if (
                expr.inferredType instanceof VoidType ||
                expr.inferredType instanceof TupleType
            ) {
                hasReturn = false;
            }

            // !important!
            // a declared function, could still be a closure!
            if (decl.codeGenProps.isClosure()) {
                let cl_reg = this.ir_generate_closure(
                    ctx,
                    decl.codeGenProps,
                    decl.context.uuid,
                );

                if (hasReturn) {
                    let tmp = this.generateTmp();
                    this.i("closure_call", cl_reg);
                    this.i(
                        getFnReturnType(expr.inferredType!),
                        tmp,
                        255,
                        getDataTypeByteSize(expr.inferredType!),
                    );
                    this.destroyTmp(cl_reg);
                    return tmp;
                } else {
                    this.i("call", cl_reg);
                    this.destroyTmp(cl_reg);
                    return "";
                }
            } else {
                let jumpId = decl.context.uuid;
                if (hasReturn) {
                    let tmp = this.generateTmp();
                    this.i("call", jumpId);
                    this.i(
                        getFnReturnType(expr.inferredType!),
                        tmp,
                        255,
                        getDataTypeByteSize(expr.inferredType!),
                    );
                    return tmp;
                } else {
                    this.i("call", jumpId);
                    return "";
                }
            }
        } else {
            let reg = this.visitExpression(expr.lhs, ctx);
            // check if the function returns a value
            let hasReturn = check_hasReturn(expr.inferredType);

            if (hasReturn) {
                let tmp = this.generateTmp();
                this.i("closure_call", reg);
                this.i(
                    getFnReturnType(expr.inferredType!),
                    tmp,
                    255,
                    getDataTypeByteSize(expr.inferredType!),
                );
                this.destroyTmp(reg);
                return tmp;
            } else {
                this.i("closure_call", reg);
                this.destroyTmp(reg);
                return "";
            }
        }
    }

    visitLambdaExpression(expr: LambdaExpression, ctx: Context): string {
        return this.ir_generate_closure(
            ctx,
            expr.definition.codeGenProps,
            expr.definition.context.uuid,
        );
    }

    visitNamedStructConstructionExpression(
        expr: NamedStructConstructionExpression,
        ctx: Context,
    ): string {
        /**
         * The hint could be a partial struct.
         * In that case, we will not use the hint type but rather the inferred type.
         */
        let hintType = expr.hintType;
        if((hintType != null) && hintType.is(ctx, PartialStructType)) {
            hintType = (hintType.to(ctx, PartialStructType) as PartialStructType).structType;
        }

        
        /**
         * s_alloc [dest] [num_fields] [struct_size]
         * s_set_offset [dest] [field_index] [offset]
         * a_set_field_[type] [dest] [field_index] [value
         */
        // important: we need to use hint type to infer the size of the struct
        // since elements within it could be promoted
        let structType =
            hintType != null
                ? getLargestStruct(
                      ctx,
                      hintType!.to(ctx, StructType) as StructType,
                      expr.inferredType!.to(ctx, StructType) as StructType,
                  )
                : (expr.inferredType!.to(ctx, StructType) as StructType);

        this.i("debug", "named struct construction expression ");
        let { reg: tmp, sortedStruct } = this.ir_allocate_struct(
            ctx,
            structType,
        );

        this.i("debug", "named struct field values");

        for (let i = 0; i < expr._plainKeyValues.length; i++) {
            let exprField = expr._plainKeyValues[i];
            let fieldInSortedStruct = sortedStruct.getField(exprField.name)!;

            if (exprField.isPartial) {
                /*
                    partial update, such as
                    x = {a: 1, b: {c: 2, d: 3}}
                    y = {...x, b: {c: 4}} <- here the field b is partial, so we need to set the field c to 4

                    so we generate as follows:
                        1. create a new struct for {c: 4}
                        2. required b from original struct (element_reg)
                        3. for every field in the new struct, we read from original struct and set to the new struct (element_reg)
                */
                let get_element_in_struct = structGetFieldType(
                    fieldInSortedStruct.type,
                );
                let element_reg = this.generateTmp();
                this.i(
                    get_element_in_struct,
                    element_reg,
                    tmp,
                    fieldInSortedStruct.getFieldID(),
                );

                let new_struct = this.visitExpression(exprField.value, ctx);

                // for every field in the new struct, we get the value and set it to the original struct
                let sorted_struct_fields = (
                    exprField.value.inferredType!.to(
                        ctx,
                        StructType,
                    ) as StructType
                ).fields;
                let tmp_reg = this.generateTmp();

                for (const field of sorted_struct_fields) {
                    let get_inst = structGetFieldType(field.type);
                    let set_inst = structSetFieldType(field.type);

                    this.i(get_inst, tmp_reg, new_struct, field.getFieldID());

                    //this.i(i_write, elementReg, field!.getFieldID(), tmp);
                    this.i(set_inst, element_reg, field.getFieldID(), tmp_reg);
                }

                this.destroyTmp(new_struct);
                this.destroyTmp(tmp_reg);
                this.destroyTmp(element_reg);
            } else {
                let res = this.visitExpression(
                    (exprField as StructKeyValueExpressionPair).value,
                    ctx,
                );
                let inst = structSetFieldType(fieldInSortedStruct.type);
                this.i(inst, tmp, fieldInSortedStruct.getFieldID(), res);
                this.destroyTmp(res);
            }
        }

        // do it at the end so it doesn't interfere with origin
        if (hintType) {
            expr.inferredType = expr.hintType;
        }

        return tmp;
    }

    visitTupleConstructionExpression(
        expr: TupleConstructionExpression,
        ctx: Context,
    ): string {
        throw new Error("Method not implemented.");
    }

    visitTupleDeconstructionExpression(
        expr: TupleDeconstructionExpression,
        ctx: Context,
    ): string {
        throw new Error("Method not implemented.");
    }

    visitCastExpression(
        expr: CastExpression,
        ctx: Context,
        argReg?: string,
    ): string {

        // first check the preset obvious cases
        if (expr._alwaysNull) {
            // if the cast is always null, return null
            let tmp = this.generateTmp();
            this.i("const_ptr", tmp, 0);
            return tmp;
        }

        if (expr._alwaysTrue) {
            // if the cast is always true, return the expression
            return this.visitExpression(expr.expression, ctx);
        }

        if(expr._castingStringToEnum){
            return this.ir_generate_string_to_enum(ctx, expr);
        }

        let castReg = argReg || this.visitExpression(expr.expression, ctx);
        let inferredType = expr.expression.inferredType?.dereference();
        let hintType = expr.target.dereference();

        if (argReg == undefined) {
            this.i("debug", "Manual Casting");
        } else {
            this.i("debug", "Inference Casting Check");
        }

        if (expr.castType == "force") {
            this.i("debug", "force cast, nothing to do");
        } else if (expr.castType == "safe") {
            this.i("debug", "safe cast");
            /**
             * Safe casts yields a nullable.
             * Safe cast is done to cast an interface to a base class or an interface to another interface
             */

            let nonNullType = (hintType as NullableType).type.dereference();
            if (
                nonNullType instanceof ClassType &&
                inferredType?.is(ctx, InterfaceType)
            ) {
                // we will have to check if the interface contains all the class methods
                // using: i_is_i interface_reg, method_uid, fail_jump_address

                // generate label to go to when check fails
                let jmpFail = this.generateLabel();

                // generate label to check to when everything is done
                let jmpEnd = this.generateLabel();

                let instanceCheckRes = this.generateTmp();
                this.i(
                    "i_is_c",
                    instanceCheckRes,
                    castReg,
                    nonNullType.getClassID(),
                );

                let tmpZero = this.generateTmp();
                this.i("const_u8", tmpZero, 0);
                this.i("j_cmp_u8", instanceCheckRes, tmpZero, 0, jmpFail);

                this.destroyTmp(tmpZero);
                this.destroyTmp(instanceCheckRes);

                // if we reached this point, it means that the interface contains all the methods
                // we can now cast
                // now jump
                this.i("j", jmpEnd);

                // if we reached this point, it means that the interface does not contain all the methods
                // we will return null
                this.i("label", jmpFail);
                this.i("const_ptr", castReg, 0);
                this.i("j", jmpEnd);

                // end label
                this.i("label", jmpEnd);

                return castReg;
            } else if (
                nonNullType.is(ctx, InterfaceType) &&
                inferredType instanceof NullableType
            ) {
                // called when we want to assign a nullable interface to a nullable interface
                // same as class, we check if the interface is null, else we change this cast to a regular one

                let failLabel = this.generateLabel();
                let endLabel = this.generateLabel();
                this.i("j_eq_null_ptr", castReg,failLabel);

                // if everything alright we cast normally
                let newCast = new CastExpression(
                    expr.location,
                    expr.expression,
                    nonNullType,
                    "regular",
                );
                expr.expression.inferredType = (
                    expr.expression.inferredType as NullableType
                ).type;

                //newCast.infer(ctx, nonNullType);
                let casted = this.visitCastExpression(newCast, ctx, castReg);
                this.destroyTmp(castReg);
                this.i("j", endLabel);
                this.i("label", failLabel);
                this.i("const_ptr", casted, 0);
                this.i("label", endLabel);
                return casted;
            } else if (
                nonNullType.is(ctx, InterfaceType) &&
                inferredType?.is(ctx, InterfaceType)
            ) {
                // convert nonNullType to interface
                let nonNullInterface = nonNullType.to(
                    ctx,
                    InterfaceType,
                ) as InterfaceType;

                // check if the interfaces align
                if (expr.isCastUnnecessary) {
                    // replace with regular cast
                    this.i(
                        "debug",
                        "replacing unnecessary safe cast with regular cast",
                    );
                    return this.visitCastExpression(
                        new CastExpression(
                            expr.location,
                            expr.expression,
                            expr.target,
                            "regular",
                        ),
                        ctx,
                        castReg,
                    );
                }

                // interface to interface requires checking if the methods are the same
                // meaning if we want to cast an interface to another interface,
                // we need to make sure that all methods in target, are present in the source
                let failLabel = this.generateLabel();
                let endLabel = this.generateLabel();

                let allMethods = [...nonNullInterface.getMethods()];
                // sort by UID
                allMethods.sort((a, b) => a.getUID() - b.getUID());

                for (let i = 0; i < allMethods.length; i++) {
                    let method = allMethods[i];
                    let methodUID = method.getUID();
                    this.i("i_has_m", methodUID, castReg, failLabel);
                }

                // if we reached this point, it means that the interface does contain all the methods
                // we can now jump to end
                this.i("j", endLabel);
                this.i("label", failLabel);
                this.i("const_ptr", castReg, 0);
                this.i("label", endLabel);
                return castReg;
            } else if (inferredType instanceof NullableType) {
                // this happens when visitCast is called manually within visit expression
                // to safely assign a class to interface or interface to another
                inferredType = inferredType.type.dereference();

                let failureLabel = this.generateLabel();
                let endLabel = this.generateLabel();

                this.i("j_eq_null_ptr", castReg, failureLabel);

                // if everything alright we cast normally
                let casted = this.visitCastExpression(
                    new CastExpression(
                        expr.location,
                        expr,
                        inferredType,
                        "regular",
                    ),
                    ctx,
                    castReg,
                );
                this.destroyTmp(castReg);
                this.i("j", endLabel);
                this.i("label", failureLabel);
                this.i("const_ptr", casted, 0);
                this.i("label", endLabel);
                return casted;
            }
        }

        this.i("debug", "regular cast");

        if (inferredType instanceof BasicType && inferredType.kind != "null") {
            let fromType = inferredType?.kind;
            let toType = hintType.kind;

            if (hintType instanceof EnumType) {
                toType = hintType.as;
            }

            if (toType == fromType) {
                return castReg;
            }

            if(fromType == "bool"){
                fromType = "u8";
            }


            // we create a new register to hold the casted value
            let tmp = this.generateTmp();
            let instruction = tmpType(new BasicType(inferredType.location, toType as BasicTypeKind));
            this.i(instruction, tmp, "reg_copy", castReg);
            castReg = tmp;

            if(toType == "bool"){
                // normally we could just cast to max type and check if it is 0
                // but instead we will use `*` to check if the value is 0
                let jumpInstruction = jCmpNullType(new BasicType(inferredType.location, fromType as BasicTypeKind));
                let non_null_reg = this.generateTmp();
                let endLabel = this.generateLabel();
                // suppose it is null
                this.i("const_u8", non_null_reg, 0);
                this.i(jumpInstruction, castReg, endLabel);
                this.i("const_u8", non_null_reg, 1);

                this.i("label", endLabel);

                this.destroyTmp(non_null_reg);
                return non_null_reg;
            }
            else {
                // generate expresion
                let instructions = generateCastInstruction(
                    fromType as unknown as CastType,
                    toType as unknown as CastType,
                    castReg,
                );

                for (let instr of instructions) {
                    let cmd = instr[0] as IRInstructionType;
                    // remaining converted to array of number
                    let args = instr.slice(1).map((x: string) => x);

                    this.i(cmd, ...args);
                }
            }
        } else if (inferredType instanceof StructType) {
            if (hintType != undefined && hintType instanceof StructType) {
                // we do nothing no more!
            }
        } else if (inferredType instanceof ClassType) {
            if (hintType.is(ctx, InterfaceType)) {
                this.i("debug", "Converted class to interface, nothing to do");
            }
        } else if (inferredType?.is(ctx, InterfaceType)) {
            if (hintType.is(ctx, InterfaceType)) {
                this.i(
                    "debug",
                    "Casting interface to interface, nothing to do",
                );
            }
        }

        return castReg;
    }

    ir_generate_string_to_enum(ctx: Context, expr: CastExpression): string {
        let inferredType = expr.inferredType;
        if(inferredType == null){
            throw new Error("Inferred type is null");
        }

        /**
         * Casting a string to an enum involves checking if the string is a valid enum value
         */

        // first create a new variable to hold the result of the expression
        let subContext = new Context(ctx.location, ctx.parser, ctx, ctx.env);
        // @ts-ignore, empty variable
        let variable = new DeclaredVariable(ctx.location, "$castRes", null, BuiltinModules.String!, false, false, false);
        subContext.addSymbol(variable);

        // first assign the string to the variable
        // and generate bytecode for it
        const element = new ElementExpression(ctx.location, "$castRes")
        let assignment = new BinaryExpression(ctx.location, element, expr.expression, "=");
        assignment.infer(subContext, BuiltinModules.String!);
        this.ir_generate_assignment(assignment, subContext);
        

        // initiate checking
        let stringEnumType = inferredType!.to(ctx, StringEnumType) as StringEnumType;
        let resTmp = this.generateTmp();

        let endLabel = this.generateLabel();
        let failLabel = this.generateLabel();

        let labels: string[] = [];
        for(let i = 0; i < stringEnumType.values.length-1; i++){
            labels.push(this.generateLabel());
        }

        for(let i = 0; i < stringEnumType.values.length; i++){
            if(i > 0){
                this.i("label", labels[i-1]);
            }
            
            let value = stringEnumType.values[i];
            let cmp = compareStringToEnum(subContext, element, value);
            let res = this.visitExpression(cmp, subContext);
            this.i("j_eq_null_u8", res, i < stringEnumType.values.length-1 ? labels[i] : failLabel);
            
            const assignExpr = new BinaryExpression(ctx.location, element, new StringLiteralExpression(ctx.location, value), "=");
            assignExpr.infer(subContext, BuiltinModules.String!);
            this.ir_generate_assignment(assignExpr, subContext);
            this.i("j", endLabel);
        }

        this.i("j", failLabel);

        // emit fail label
        this.i("label", failLabel);
        this.i("const_ptr", resTmp, 0);
        this.i("label", endLabel);

        return resTmp;
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
            this.i("const_u8", t, 0);
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
            let instruction = tmpType(expr.inferredType!);
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
        let instruction = tmpType(expr.inferredType!);
        this.i(instruction, tmpRes, "reg", reg);
        this.destroyTmp(reg);

        // now the end label
        this.i("debug", "if-else expression end label");
        this.i("label", finalJump);

        return tmpRes;
    }

    visitLetInExpression(expr: LetInExpression, ctx: Context): string {
        this.i(
            "debug",
            "let-in expression: " +
                expr.variables.map((v) => v.name).join(", "),
        );
        // generate the variables
        var processed: DeclaredVariable[] = [];
        for (let decl of expr.variables) {
            // since we sometime look forward in the list of variables
            // we might group some variables decl that share the same base expression
            // such as tuple deconstructions, array deconstructions, etc.
            // so if they are already processed (means pushed into processed), we skip them
            if (processed.includes(decl)) {
                continue;
            }

            if (decl.isFromTuple || decl.isFromArray || decl.isFromStruct) {
                let group: DeclaredVariable[] = [];
                // find all tuple deconstructions in the initializer
                for (let decl_ of expr.variables) {
                    if (decl_.initGroupID == decl.initGroupID) {
                        processed.push(decl_);
                        group.push(decl_);
                    }
                }

                if (decl.isFromTuple) {
                    this.visitTupeDeconstructionGroup(ctx, group);
                } else if (decl.isFromArray) {
                    this.visitArrayDeconstructionGroup(ctx, group);
                } else if (decl.isFromStruct) {
                    this.visitStructDeconstructionGroup(ctx, group);
                }
                continue;
            }

            /*
            let tmp = this.visitExpression(decl.initializer, ctx);
            let inst = (this.isGlobal?globalType:localType)(ctx, decl.annotation!);
            this.i(inst, decl.uid, tmp); // local_[type] = tmp
            this.destroyTmp(tmp);
            */

            let left: Expression = new ElementExpression(
                decl.location,
                decl.name,
            );
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
            // !!! IMPORTANT: we have to create new array as some other methods awaiting to be generated
            let classMethods = [...classType.getAllMethods()];
            let num_methods = classMethods.length;

            this.i(
                "debug",
                `class allocation\nnum methods: ${num_methods} \ndata size: ${size_attrs}`,
            );

            const templateIdx = this.templateSegment.registerClass(ctx, classType);
            this.i("c_alloc_t", tmp, templateIdx);

            // last call the constructor
            let constructor = expr._calledInitMethod;
            if (constructor != null) {
                let constructorIndex =
                    constructor._sourceMethod?.indexInClass ?? -1;

                if (constructorIndex == -1) {
                    throw new Error("Constructor not found in class");
                }

                this.i("debug", "class allocation, calling constructor");

                let instructions: IRInstructionType[] = [];
                let regs: string[] = [];

                this.i("debug", "class allocation, calling constructor");
                let tmp_constructor = this.generateTmp();
                this.i("c_load_m", tmp_constructor, tmp, constructor.getUID());

                // generate the arguments, backwards
                for (let i = 0; i < expr.arguments.length; i++) {
                    let arg = expr.arguments[i];
                    let tmp = this.visitExpression(arg, ctx);
                    let pushArgInst = fnSetArgType(arg.inferredType!);
                    instructions.push(pushArgInst);
                    regs.push(tmp);
                }

                this.i("fn_alloc");
                this.i("fn_set_reg_ptr", 0, tmp);

                for (let i = 0; i < instructions.length; i++) {
                    this.i(instructions[i], i + 1, regs[i]);
                    this.destroyTmp(regs[i]);
                }

                // now call

                this.i("call_ptr", tmp_constructor);
                this.destroyTmp(tmp_constructor);
            } else {
                // no constructor, we do nothing
                this.i("debug", "class allocation, no constructor");
            }
            return tmp;
        } else {
            throw new Error(
                "Invalid new expression, expected class got " +
                    baseType?.toString(),
            );
        }
    }

    visitLiteralExpression(expr: LiteralExpression, ctx: Context): string {
        let tmp = this.generateTmp();
        let tmpIndexReg = this.generateTmp();
        // if hint is available, use it
        // hint type removed because upcasting is done after evaluation
        let c = constType(/*expr?.hintType ??*/ expr?.inferredType!);

        if (expr instanceof StringLiteralExpression) {
            /*
             * We generate the code as follows:
             * 1. generate bytes string
             * 2. Call default string.fromBuffer(bytes) method
             * 3. Destroy bytes string
             * 4. return the result of the method call
             */
            let exprBin = new BinaryStringLiteralExpression(
                expr.location,
                expr.value,
            );
            let fromBytes = new FunctionCallExpression(
                expr.location,
                new MemberAccessExpression(
                    expr.location,
                    new ElementExpression(expr.location, "String"),
                    new ElementExpression(expr.location, "fromBytes"),
                ),
                [exprBin],
            );

            // we have to force the type to be string because of the string enum
            fromBytes.infer(ctx, BuiltinModules.String!/*expr.inferredType*/);
            let res = this.visitFunctionCallExpression(fromBytes, ctx);
            //expr.inferredType = fromBytes.inferredType;
            return res;
        } else if (expr instanceof BinaryStringLiteralExpression) {
            this.i("const_str", tmp, tmpIndexReg, expr.value);
            this.destroyTmp(tmpIndexReg);
        } else if (expr instanceof HexIntLiteralExpression)
            // convert hex to number
            this.i(c, tmp, parseInt(expr.value, 16) + "");
        else if (expr instanceof IntLiteralExpression)
            this.i(c, tmp, expr.value);
        else if (expr instanceof CharLiteralExpression)
            this.i(c, tmp, expr.value);
        else if (expr instanceof TrueLiteralExpression) this.i(c, tmp, 1);
        else if (expr instanceof FalseLiteralExpression) this.i(c, tmp, 0);
        else if (expr instanceof FloatLiteralExpression)
            this.i(c, tmp, expr.value);
        else if (expr instanceof DoubleLiteralExpression)
            this.i(c, tmp, expr.value);
        else if (expr instanceof NullLiteralExpression) this.i(c, tmp, 0);
        else throw new Error("Unknown literal type " + expr.literalKind);

        return tmp;
    }

    visitUnaryExpression(expr: UnaryExpression, ctx: Context): string {
        // case 1: operator overload
        if (expr.operatorOverloadState.isMethodCall) {
            let methodCall = new FunctionCallExpression(
                expr.location,
                new MemberAccessExpression(
                    expr.location,
                    expr.expression,
                    new ElementExpression(
                        expr.location,
                        expr.operatorOverloadState.methodRef!.name,
                    ),
                ),
                [],
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
            this.i(
                "debug",
                "unary minus expression, replacing with subtraction with 0",
            );
            // must set entire register
            this.i("const_u64", zeroTmp, 0);
            this.i(
                getUnaryInstruction(expr.inferredType as BasicType, "-"),
                resTmp,
                zeroTmp,
                uhsReg,
            );
            this.destroyTmp(uhsReg);
            this.destroyTmp(zeroTmp);
            return resTmp;
        }

        if (["!", "~"].includes(expr.operator)) {
            let uhsReg = this.visitExpression(expr.expression, ctx);
            let resTmp = this.generateTmp();
            this.i(
                getUnaryInstruction(
                    expr.inferredType as BasicType,
                    expr.operator,
                ),
                resTmp,
                uhsReg,
            );
            this.destroyTmp(uhsReg);
            return resTmp;
        }

        if (expr.operator == "pre++" || expr.operator == "pre--") {
            // transfer to addition
            let one = new IntLiteralExpression(expr.location, "1");

            let assignExpr = this.buildOpAssignBinaryExpr(
                ctx,
                expr.expression,
                one,
                expr.operator == "pre++" ? "+" : "-",
                expr.inferredType!,
            );

            return this.visitExpression(assignExpr, ctx);
        }

        if (expr.operator == "post++" || expr.operator == "post--") {
            throw new Error("Postfix operators are not yet implemented");
        }

        throw new Error("Unknown unary operator " + expr.operator);
    }

    visitArrayConstructionExpression(
        expr: ArrayConstructionExpression,
        ctx: Context,
    ): string {
        this.i("debug", "visitArrayConstructionExpression");

        if (!(expr.inferredType! instanceof ArrayType)) {
            throw new Error(
                "Invalid array construction expression, expected array got " +
                    expr.inferredType?.toString(),
            );
        }

        // Filter out the regular (non-destructuring) elements
        let regularElts = expr.elements.filter(
            (e) => !(e instanceof ArrayUnpackingExpression),
        );
        let arrayType: ArrayType = expr.inferredType.to(
            ctx,
            ArrayType,
        ) as ArrayType;
        let elementType = arrayType.arrayOf;
        let elementSize = getDataTypeByteSize(elementType);

        let arrayReg = this.generateTmp();

        // Initially, we don't know the final array size due to destructured elements, so start with a basic allocation
        let arraySize = regularElts.length;
        let isPtr = isPointer(elementType);
        this.i("a_alloc", arrayReg, isPtr ? 1 : 0, arraySize, elementSize);

        // Copy regular elements into the array
        for (let i = 0; i < arraySize; i++) {
            this.i("debug", "copying array element " + i);
            let resReg = this.visitExpression(regularElts[i], ctx);

            let aSet = arraySetIndexType(elementType);
            let indexReg = this.generateTmp();
            this.i("const_u64", indexReg, i); // Set index for current element
            this.i(aSet, arrayReg, indexReg, resReg); // Insert the element into the array

            this.destroyTmp(resReg);
            this.destroyTmp(indexReg);
        }

        // Now handle the destructured elements
        let unpackedElts: ArrayUnpackingExpression[] = [];
        let unpackedIndexes: number[] = [];

        // Gather destructured elements and their corresponding indexes
        // each destructured element counts how many non destructured elements are before it
        let counter = 0;
        for (let i = 0; i < expr.elements.length; i++) {
            let e = expr.elements[i];
            if (e instanceof ArrayUnpackingExpression) {
                unpackedElts.push(e);
                unpackedIndexes.push(counter);
                counter = 0;
            } else {
                counter++;
            }
        }

        // If there are destructured elements, process them
        if (unpackedElts.length > 0) {
            let offsetReg = this.generateTmp();
            this.i("const_u64", offsetReg, 0); // Set the index where destructured array starts

            for (let i = 0; i < unpackedElts.length; i++) {
                let posReg = this.generateTmp();
                this.i("const_u64", posReg, unpackedIndexes[i]);
                this.i("add_u64", offsetReg, offsetReg, posReg);
                this.destroyTmp(posReg);

                let exprReg = this.visitExpression(
                    unpackedElts[i].expression,
                    ctx,
                ); // Visit destructured array expression

                // Insert the destructured array at the current index
                this.i("a_insert_a", offsetReg, arrayReg, exprReg, offsetReg);

                // Clean up temporary registers
                this.destroyTmp(exprReg);
            }
        }

        return arrayReg; // Return the final array register
    }

    /**
     * used to transform things like x+=1 or x[i] += 1 or x[i]++ etc
     */
    buildOpAssignBinaryExpr(
        ctx: Context,
        left: Expression,
        right: Expression,
        operator: BinaryExpressionOperator,
        inferredType: DataType,
    ): Expression {
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
        let addExpr = new BinaryExpression(
            left.location,
            left,
            right,
            operator,
        );

        /**
         * Support case of ++x[i]
         */
        let assignExpr: BinaryExpression | IndexSetExpression | null = null;
        if (left instanceof IndexAccessExpression) {
            assignExpr = new IndexSetExpression(
                left.location,
                left.lhs,
                left.indexes,
                addExpr,
            );
        } else {
            assignExpr = new BinaryExpression(
                left.location,
                left,
                addExpr,
                "=",
            );
        }

        assignExpr.infer(ctx, inferredType);

        return assignExpr;
    }

    visitDoExpression(expr: DoExpression, ctx: Context): string {
        let lbl = this.generateLabel();
        let tmp = this.generateTmp();

        this.doExpressionLabelStack.push(lbl);
        this.doExpressionTmpStack.push(tmp);

        this.visitStatement(expr.block!, ctx);

        this.i("label", lbl);
        this.doExpressionLabelStack.pop();
        this.doExpressionTmpStack.pop();

        return tmp;
    }

    visitCoroutineConstructionExpression(
        expr: CoroutineConstructionExpression,
        ctx: Context,
    ): string {
        let tmp = this.generateTmp();
        let fnReg = this.visitExpression(expr.baseFn, ctx);
        this.i("coroutine_alloc", tmp, fnReg);
        this.destroyTmp(fnReg);
        return tmp;
    }

    visitYieldExpression(expr: YieldExpression, ctx: Context): string {
        this.ir_generate_return(expr.yieldExpression, ctx, null, null, true);
        // yield either returns a tuple or a value
        if (expr.isFinal) {
            this.i("coroutine_ret");
        } else {
            this.i("coroutine_yield");
        }

        return "";
    }

    //ezpezlemonsqez
    visitMutateExpression(expr: MutateExpression, ctx: Context): string {
        let resTmp = this.visitExpression(expr.expression, ctx);
        return resTmp;
    }

    visitUnreachableExpression(expr: UnreachableExpression, ctx: Context): string {
        this.i("debug", "unreachable expression");
        this.i("throw_rt", 0);
        let tmp = this.generateTmp();
        this.i("const_u8", tmp, 0);
        return tmp;
    }

    visitThrowExpression(expr: ThrowExpression, ctx: Context): string {
        let callToCString = new FunctionCallExpression(
            expr.location, 
            new MemberAccessExpression(
                expr.location, 
                expr.message, 
                new ElementExpression(expr.location, "toCString")), 
            []);

        callToCString.infer(ctx, new ArrayType(expr.location, new BasicType(expr.location, "u8")));

        let messageReg = this.visitExpression(callToCString, ctx);
        
        this.i("throw_user_rt", messageReg);
        this.destroyTmp(messageReg);

        return "";
    }

    visitThisDistributedAssignExpression(expr: ThisDistributedAssignExpression, ctx: Context): string {
        let exprs = expr.buildExpressions(ctx);
        for(let e of exprs) {
            e.infer(ctx, null);
            this.visitExpression(e, ctx);
        }
        let tmp = this.generateTmp();
        tmp = this.visitExpression(expr.left, ctx);
        return tmp;
    }

    /**
     * Statements
     */
    visitStatement(stmt: Statement, ctx: Context) {
        this.srcMapPushLoc(stmt.location);
        if (stmt instanceof ExpressionStatement) {
            let res = this.visitExpression(stmt.expression, ctx);
            this.destroyTmp(res);
        } else if (stmt instanceof BlockStatement)
            this.visitBlockStatement(stmt, ctx);
        else if (stmt instanceof BreakStatement)
            this.visitBreakStatement(stmt, ctx);
        else if (stmt instanceof ContinueStatement)
            this.visitContinueStatement(stmt, ctx);
        else if (stmt instanceof DoWhileStatement)
            this.visitDoWhileStatement(stmt, ctx);
        else if (stmt instanceof ForeachStatement)
            this.visitForeachStatement(stmt, ctx);
        else if (stmt instanceof ForStatement)
            this.visitForStatement(stmt, ctx);
        else if (stmt instanceof FunctionDeclarationStatement)
            this.visitFunctionDeclarationStatement(stmt, ctx);
        else if (stmt instanceof IfStatement) this.visitIfStatement(stmt, ctx);
        else if (stmt instanceof MatchStatement)
            this.visitMatchStatement(stmt, ctx);
        else if (stmt instanceof ReturnStatement)
            this.visitReturnStatement(stmt, ctx);
        else if (stmt instanceof VariableDeclarationStatement)
            this.visitVariableDeclarationStatement(stmt, ctx);
        else if (stmt instanceof WhileStatement)
            this.visitWhileStatement(stmt, ctx);
        else {
            throw new Error("Unknown statement type " + stmt.constructor.name);
        }
        this.srcMapPopLoc();
    }

    visitBlockStatement(stmt: BlockStatement, ctx: Context) {
        this.i("debug", "Entering block " + stmt.context.uuid);
        for (const [i, s] of stmt.statements.entries()) {
            this.visitStatement(s, stmt.context);
        }
        this.i("debug", "Exiting block " + stmt.context.uuid);
    }
    visitBreakStatement(stmt: BreakStatement, ctx: Context) {
        let endLabel = this.getLoopEndLabel();
        this.i("debug", "break statement");
        this.i("j", endLabel);
    }
    visitContinueStatement(stmt: ContinueStatement, ctx: Context) {
        let loopBegin = this.getLoopBeginLabel();
        this.i("debug", "continue statement");
        this.i("j", loopBegin);
    }

    visitDoWhileStatement(stmt: DoWhileStatement, ctx: Context) {
        this.i("debug", "do-while statement");
        // generate the label first

        // This is not the jump location of continue, it is the label of the body!
        // a continue statement will jump to the condition check
        let loopBodyLabel = stmt.body.context.uuid;
        let loopConditionLabel = this.generateLabel();
        let loopEndLabel = stmt.body.context.generateEndOfContextLabel();

        this.pushLoopLabels(loopConditionLabel, loopEndLabel);

        this.i("label", loopBodyLabel);

        // generate the body
        this.i("debug", "do-while statement body");
        this.visitStatement(stmt.body, stmt.body.context);

        // generate the condition
        this.i("debug", "do-while statement condition");
        let resTmp = this.visitExpression(stmt.condition, stmt.body.context);
        this.i("j_eq_null_u8", resTmp, loopEndLabel);
        this.i("j", loopBodyLabel)
        this.destroyTmp(resTmp);


        this.i("debug", "do-while statement end of scope");
        // generate the end of scope label for break statements
        this.i("label", loopEndLabel);

        this.popLoopLabels();
    }
    
    visitForeachStatement(stmt: ForeachStatement, ctx: Context) {
        if(stmt.iteratorType == "array"){
            // gets transformed to a for statement
            /**
             * foreach i, v in arr -> for (i = 0; i < arr.length; i++, v = arr[i]) {
             */

            let forLoop = convertForeachArrayToFor(stmt)

            forLoop.infer(ctx);
            this.visitForStatement(forLoop, ctx);
        }
        else if (stmt.iteratorType == "AbstractIterable") {
            let forLoop = convertForeachAbstractIterableToFor(stmt)

            forLoop.infer(ctx);
            this.visitForStatement(forLoop, ctx);

        }
        else if (stmt.iteratorType == "coroutine") {
            // coroutine foreach is not supported
            throw new Error("Coroutine foreach is not supported");
        }
        else {
            throw new Error("Unknown iterator type " + stmt.iteratorType);
        }
    }

    visitForStatement(stmt: ForStatement, ctx: Context) {
        // start with the initialization
        this.i("debug", "for-statement init");
        for (let init of stmt.initializers) {
            this.visitStatement(init, stmt.context);
        }

        let loopIncrementalsLabel = this.generateLabel();
        let beginLabel = stmt.context.uuid;
        let endLabel = stmt.context.generateEndOfContextLabel();

        this.pushLoopLabels(loopIncrementalsLabel, endLabel);

        // generate the label for continue
        this.i("debug", "for-statement label");
        this.i("label", beginLabel);

        // generate the conditions
        this.i("debug", "for-statement condition");
        if (stmt.condition) {
            let resTmp = this.visitExpression(stmt.condition, stmt.context);

            let tmp = this.generateTmp();
            // u8 because all logical operators return u8
            this.i("const_u8", tmp, 0);
            this.i(
                "j_cmp_u8",
                resTmp,
                tmp,
                0,
                endLabel,
            );
            this.destroyTmp(tmp);
            this.destroyTmp(resTmp);
        }

        // generate the body
        this.i("debug", "for-statement body");
        this.visitStatement(stmt.body, stmt.context);

        // generate the increment
        this.i("debug", "for-statement increment");
        this.i("label", loopIncrementalsLabel);
        for (let inc of stmt.incrementors) {
            this.visitExpression(inc, stmt.context); // we do not need to store the result
        }

        // generate the jump instruction to continue the loop, unconditionally
        this.i("debug", "for-statement jump");
        this.i("j", stmt.context.uuid);

        // generate the end of scope label for break statements
        this.i("debug", "for-statement end of scope");
        this.i("label", endLabel);

        this.popLoopLabels();
    }
    visitFunctionDeclarationStatement(
        stmt: FunctionDeclarationStatement,
        ctx: Context,
    ) {
        // function declarations are already generated, as they are moved to the base global context
        // and generated there
        return;
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
            this.i("const_u8", tmp, 0);
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
        // first generate the expression
        //let tmp = this.visitExpression(stmt.expression, ctx);

        // now we perform the matching, we will have different block per case.
        // case checking is done through structure first, then value
        // meaning [a, ...b], will check if the array is of length 1 at least
        // then assigns the values (if present)
        // then checks the guard (if present)
        // then jumps to the body

        let switchLabels = stmt.cases.map((c) => this.generateLabel());
        let caseLabels = stmt.cases.map((c) => this.generateLabel());
        let endLabel = this.generateLabel();
        
        caseLabels.push(endLabel);
        switchLabels.push(endLabel);

        let counter = 0;
        for (let case_ of stmt.cases) {
            let expr = checkSubPattern(
                case_.context,
                stmt.expression,
                case_.pattern,
            );
            let cond = expr.condition || TrueLiteralExpression.makeLiteral(case_.location);
            let variables = expr.variableAssignments;

            cond.infer(case_.context, new BooleanType(case_.location));
            // generate the condition
            this.i("label", switchLabels[counter]);
            let tmp = this.visitExpression(cond, case_.context);
            // fill in the variables
            if (variables.length > 0) {
                // we add a cmp to avoid filling in the variables if the condition is false
                let tmp2 = this.generateTmp();
                this.i("const_u8", tmp2, 0);
                this.i("j_cmp_u8", tmp, tmp2, 0, switchLabels[counter + 1]);
                this.destroyTmp(tmp2);

                // now we fill in the variables
                for (let variable of variables) {
                    let tmp2 = this.visitExpression(variable, case_.context);
                    this.destroyTmp(tmp2);
                }
            }

            if (case_.guard) {
                let guardTmp = this.visitExpression(case_.guard, case_.context);
                let andTmp = this.generateTmp();
                this.i("and", andTmp, tmp, guardTmp);
                this.destroyTmp(tmp);
                this.destroyTmp(guardTmp);

                let tmp2 = this.generateTmp();
                this.i("const_u8", tmp2, 0);
                this.i("j_cmp_u8", andTmp, tmp2, 1, caseLabels[counter]);
                this.destroyTmp(tmp2);
            } else {
                let tmp2 = this.generateTmp();
                this.i("const_u8", tmp2, 0);
                this.i("j_cmp_u8", tmp, tmp2, 1, caseLabels[counter]);
                this.destroyTmp(tmp2);
                this.destroyTmp(tmp);
            }
            counter++;
        }
        // if no case matched, we jump to the end
        this.i("j", endLabel);

        counter = 0;
        for (let case_ of stmt.cases) {
            this.i("label", caseLabels[counter]);

            if (case_.expression) {
                let tmp = this.visitExpression(case_.expression, case_.context);
                this.destroyTmp(tmp);
            } else {
                this.visitStatement(case_.block!, case_.context);
            }

            this.i("j", endLabel);
            counter++;
        }

        this.i("label", endLabel);
    }

    /**
     * Return can be used to return from a function or a do-expression
     * When we return a function, we have no jump label (in the doExpressionLabelStack), so we emit ret_XYZ
     * When we return from a do-expression, we have a jump label, so we emit ret_void
     * @param stmt
     * @param ctx
     * @param jmpLabel
     */
    visitReturnStatement(stmt: ReturnStatement, ctx: Context) {
        let jmpLabel = null;
        let resTmp = null;
        if (this.doExpressionLabelStack.length > 0) {
            jmpLabel =
                this.doExpressionLabelStack[
                    this.doExpressionLabelStack.length - 1
                ];
            resTmp =
                this.doExpressionTmpStack[this.doExpressionTmpStack.length - 1];
        }

        if (stmt.returnExpression) {
            this.ir_generate_return(
                stmt.returnExpression,
                ctx,
                jmpLabel,
                resTmp,
            );
        } else {
            this.i("debug", "return statement void");
            if (jmpLabel) {
                throw "Unreachable code";
            } else {
                // add a ret void to mark the end of the function
                this.ir_generate_end_ret();
            }
        }
    }
    visitVariableDeclarationStatement(
        stmt: VariableDeclarationStatement,
        ctx: Context,
    ) {
        var processed: DeclaredVariable[] = [];
        for (let decl of stmt.variables) {
            // since we sometime look forward in the list of variables
            // we might group some variables decl that share the same base expression
            // such as tuple deconstructions, array deconstructions, etc.
            // so if they are already processed (means pushed into processed), we skip them
            if (processed.includes(decl)) {
                continue;
            }

            if (decl.isFromTuple || decl.isFromArray || decl.isFromStruct) {
                let group: DeclaredVariable[] = [];
                // find all tuple deconstructions in the initializer
                for (let decl_ of stmt.variables) {
                    if (decl_.initGroupID == decl.initGroupID) {
                        processed.push(decl_);
                        group.push(decl_);
                    }
                }

                if (decl.isFromTuple) {
                    this.visitTupeDeconstructionGroup(ctx, group);
                } else if (decl.isFromArray) {
                    this.visitArrayDeconstructionGroup(ctx, group);
                } else if (decl.isFromStruct) {
                    this.visitStructDeconstructionGroup(ctx, group);
                }
                continue;
            }

            // translate the expression into <left> = <right>
            let left: Expression = new ElementExpression(
                decl.location,
                decl.name,
            );
            let right = decl.initializer;
            let assign = new BinaryExpression(decl.location, left, right, "=");
            // we need to set ignoreConst to true, because we the variable might be const,
            // and we are changing the structure of the assignment
            assign.infer(ctx, decl.annotation, { ignoreConst: true });
            let tmp = this.visitExpression(assign, ctx);
            this.destroyTmp(tmp);
        }
    }
    visitWhileStatement(stmt: WhileStatement, ctx: Context) {
        // generate the label first
        this.i("debug", "while statement");
        let conditionLabel = this.generateLabel();
        let beginLabel = conditionLabel;
        let endLabel = stmt.body.context.generateEndOfContextLabel();

        this.pushLoopLabels(beginLabel, endLabel);

        // generate the condition
        this.i("debug", "while statement condition");
        this.i("label", conditionLabel);
        let resTmp = this.visitExpression(stmt.condition, stmt.body.context);
        this.i("j_eq_null_u8", resTmp, endLabel);

        // generate the body
        this.i("debug", "while statement body");
        this.i("label", stmt.body.context.uuid);
        this.visitStatement(stmt.body, stmt.body.context);
        // generate the jump instruction
        this.i("debug", "while statement jump");
        this.i("j", conditionLabel);

        // generate the end of scope label for break statements
        this.i("debug", "while statement end of scope");
        this.i("label", endLabel);

        this.popLoopLabels();
    }

    visitTupeDeconstructionGroup(ctx: Context, group: DeclaredVariable[]) {
        // (a, b) = f()
        // or
        // (a, b) = do { return (1, 2) } // not yet implemented
        // first generate the expression

        this.i("debug", "tuple deconstruction group");

        let fnReg = this.visitExpression(
            (group[0].initializer as TupleDeconstructionExpression)
                .tupleExpression,
            ctx,
        );

        let initializer = group[0].initializer as TupleDeconstructionExpression

        if(
            (initializer.tupleExpression instanceof FunctionCallExpression) && 
            (initializer.tupleExpression as FunctionCallExpression)._calledFFIMethod && 
            (initializer.tupleExpression as FunctionCallExpression).inferredType!.is(ctx, TupleType)
        ){
            let ret =  (initializer.tupleExpression as FunctionCallExpression).inferredType!.to(ctx, TupleType) as TupleType;

            let usedTmps: string[] = [];
            let lastTmp = ""

            for (const decl of group) {
                let expr: Expression = new ElementExpression(
                    decl.location,
                    decl.name,
                );
                let elementReg = this.visitExpression(expr, ctx);

                let returnIndex = (
                    decl.initializer as TupleDeconstructionExpression
                ).index;

                usedTmps[returnIndex] = elementReg;
            }

            for(let i = 0; i < ret.length; i++){
                let tmp = "";
                if(usedTmps[i]){
                    tmp = usedTmps[i];
                }else{
                    tmp = this.generateTmp();
                }
                let instruction = popStackType(ret.types[i]);
                this.i(instruction, tmp);
                lastTmp = tmp;
            }

            return lastTmp;
        }


        this.destroyTmp(fnReg);

        // we do not perform a direct assignment, rather we a fn_get_reg_u32 and such
        for (const decl of group) {
            let expr: Expression = new ElementExpression(
                decl.location,
                decl.name,
            );
            let elementReg = this.visitExpression(expr, ctx);

            let returnIndex = (
                decl.initializer as TupleDeconstructionExpression
            ).index;

            let inst = fnGetRetType(decl.annotation!);
            this.i(inst, elementReg, 255 - returnIndex);
        }
    }

    visitArrayDeconstructionGroup(ctx: Context, group: DeclaredVariable[]) {
        // (a, b) = f()

        // first generate the expression
        this.i("debug", "array deconstruction group");
        let arrayExpression = (
            group[0].initializer as ArrayDeconstructionExpression
        ).arrayExpression;
        let reg = this.visitExpression(arrayExpression, ctx);
        let arrayType = arrayExpression.inferredType! as ArrayType;

        for (const [i, decl] of group.entries()) {
            let init = decl.initializer as ArrayDeconstructionExpression;
            let expr: Expression = new ElementExpression(
                decl.location,
                decl.name,
            );
            let elementReg = this.visitExpression(expr, ctx);

            if (init.rest) {
                // we have to generate slice so first, get the length
                let tmpStart = this.generateTmp();
                this.i("const_u64", tmpStart, init.index);
                let tmpEnd = this.generateTmp();
                this.i("a_len", tmpEnd, reg);

                this.i("a_slice", elementReg, reg, tmpStart, tmpEnd);
                this.destroyTmp(tmpStart);
                this.destroyTmp(tmpEnd);
            } else {
                let instr = arrayGetIndexType(arrayType.arrayOf.dereference());
                let idxTmp = this.generateTmp();
                this.i("const_u64", idxTmp, i);
                this.i(instr, elementReg, idxTmp, reg);
                this.destroyTmp(idxTmp);
            }

            this.destroyTmp(elementReg);
        }

        this.destroyTmp(reg);
    }

    visitStructDeconstructionGroup(ctx: Context, group: DeclaredVariable[]) {
        // {a, b:c, ...d} = someStruct

        // first generate the expression
        this.i("debug", "struct deconstruction group");
        let reg = this.visitExpression(
            (group[0].initializer as StructDeconstructionExpression)
                .structExpression,
            ctx,
        );
        let structType = (
            group[0].initializer as StructDeconstructionExpression
        ).structExpression.inferredType! as StructType;

        for (const [i, decl] of group.entries()) {
            let init = decl.initializer as StructDeconstructionExpression;
            let expr: Expression = new ElementExpression(
                decl.location,
                decl.name,
            );
            let elementReg = this.visitExpression(expr, ctx);

            if (init.rest) {
                let remainingStruct = decl.initializer
                    .inferredType! as StructType;
                // we will need to allocate a new struct and copy the values over
                let { sortedStruct } = this.ir_allocate_struct(
                    ctx,
                    remainingStruct,
                    elementReg,
                );

                for (const [i, field] of sortedStruct.fields.entries()) {
                    let tmp = this.generateTmp();
                    // read from the original struct
                    let i_read = structGetFieldType(field!.type);
                    this.i(i_read, tmp, reg, field!.getFieldID());

                    // write to the new struct
                    let i_write = structSetFieldType(field!.type);
                    this.i(i_write, elementReg, field!.getFieldID(), tmp);
                    this.destroyTmp(tmp);
                }

                this.destroyTmp(reg);
            } else {
                let field = structType.getField(init.field!);

                let elementReg = this.visitExpression(expr, ctx);
                let instr = structGetFieldType(field!.type);

                this.i(instr, elementReg, reg, field!.getFieldID());
                this.destroyTmp(elementReg);
            }
        }
    }

    /**
     * Allocates a new struct in the given register, or in a new temporary register if reg is not given.
     * @param ctx
     * @param structType
     * @param reg
     * @returns
     */
    ir_allocate_struct(ctx: Context, structType: StructType, reg?: string) {
        let st = structType.toSortedStruct();
        let tmp: string = reg ?? this.generateTmp();

        this.i("debug", "struct construction expression ");
        let idx = this.templateSegment.registerStruct(ctx, st)
        this.i("s_alloc_t", tmp, idx);

        return { reg: tmp, sortedStruct: st };
    }

    ir_generate_tuple_return(
        ctx: Context,
        returnExpression: TupleConstructionExpression,
    ) {
        // we return elements one by one
        for (let [i, el] of returnExpression.elements.entries()) {
            this.i("debug", "return tuple element #" + i);
            let tmp = this.visitExpression(el, ctx);
            let retInst = retType(el.inferredType!);
            this.i(retInst, tmp, i);
            this.destroyTmp(tmp);
        }
    }

    ir_generate_closure(
        ctx: Context,
        codeGenProps: FunctionCodegenProps,
        uuid: string,
    ) {
        /**
         * We create a closure
         */
        let tmp = this.generateTmp();
        const upvalues = codeGenProps.upvalues;
        const args = codeGenProps.argSymbols;

        // make sure we have less than 255 upvalues
        if (upvalues.size > 255) {
            ctx.parser.customError(
                "Too many upvalues for a single closure, max is 255",
                ctx.location,
            );
        }

        let addressReg = this.generateTmp();
        this.i("closure_alloc", tmp, args.size, upvalues.size, uuid);
        this.destroyTmp(addressReg);
        // we need to setup the closure context
        for (const [i, sym] of upvalues) {
            // we register the upvalue in the closure
            // closure.env[i] = sym.uid // uid will be replace with the proper register later

            // get the sym type:
            let type = getSymbolType(sym);

            let tmpReg = this.generateTmp();
            let instruction = tmpType(type);

            if (sym.uid == "$this") {
                this.i(instruction, tmpReg, "arg", sym.uid);
            } else {
                let symScope = ctx.lookupScope(sym.name)!;
                if (symScope.scope == "global") {
                    throw "Unreachable";
                } else if (symScope.scope == "local") {
                    this.i(instruction, tmpReg, "local", sym.uid);
                } else {
                    // for upvalue, we use arg
                    this.i(instruction, tmpReg, "arg", sym.uid);
                }
            }
            let inst = closurePushEnvType(type);
            this.i(inst, tmp, tmpReg);
        }

        return tmp;
    }

    ir_generate_null_coalescing(ctx: Context, expr: BinaryExpression) {
        let instruction = tmpType(expr.inferredType!);

        let tmpRes = this.generateTmp();
        let rhsLabel = this.generateLabel();
        this.pushCoalescingLabel(rhsLabel);
        // a ?? b -> if a is null, return b, otherwise return a, so we need a label for the null case
        let aTmp = this.visitExpression(expr.left, ctx);

        let lblEnd = this.generateLabel();

        // if the LHS evaluates to NULL, we jump to the rhsLabel
        // null evaluation only applied if the expression evaluates to an object
        if(expr.left.inferredType!.allowedNullable(ctx)){
            this.i("j_eq_null_ptr", aTmp, rhsLabel);
        }

        // if the LHS evaluates successfully, we jump to the end label
        // otherwise it will jump to the rhsLabel
        this.i(instruction, tmpRes, "reg", aTmp);
        this.i("j", lblEnd);

        // if a is null, we return b
        this.i("label", rhsLabel);
        this.popCoalescingLabel();
        let bTmp = this.visitExpression(expr.right, ctx);
        this.i(instruction, tmpRes, "reg", bTmp);

        this.i("label", lblEnd);

        this.destroyTmp(aTmp);
        this.destroyTmp(bTmp);
        return tmpRes;
    }

    ir_generate_struct_merge(expr: BinaryExpression, ctx: Context) {
        let lhs = this.visitExpression(expr.left, ctx);
        let rhs = this.visitExpression(expr.right, ctx);
        
        let lhsStruct = (expr.left.inferredType!.is(ctx, StructType)) ? 
                            expr.left.inferredType!.to(ctx, StructType) as StructType : 
                            (expr.left.inferredType!.to(ctx, PartialStructType) as PartialStructType).getStructType(ctx);
        let rhsStruct = (expr.right.inferredType!.is(ctx, StructType)) ? 
                            expr.right.inferredType!.to(ctx, StructType) as StructType : 
                            (expr.right.inferredType!.to(ctx, PartialStructType) as PartialStructType).getStructType(ctx);

        let srcStruct = lhsStruct;

        // assume >>
        let src = lhs;
        let dst = rhs;

        if(expr.operator == "<<"){
            src = rhs;
            dst = lhs;
            srcStruct = rhsStruct;
        }

        for(const [i, field] of srcStruct.fields.entries()){
            let instruction = structCopyFieldType(field!.type);
            this.i(instruction, dst, src, field!.getFieldID());
        }

        return dst;
    }

    ir_generate_tuple_assignment(ctx: Context, expr: BinaryExpression) {
        let tuples = expr.left as TupleConstructionExpression;
        let assignment = expr.right;

        // (a, b) = f()
        // or
        // (a, b) = do { return (1, 2) } // not yet implemented
        // first generate the expression

        this.i("debug", "tuple assignment deconstruction group");
        let fnReg = this.visitExpression(assignment, ctx);

        this.destroyTmp(fnReg);

        // we do not perform a direct assignment, rather we a fn_get_reg_u32 and such
        for (const [i, decl] of tuples.elements.entries()) {
            let expr = decl;
            let elementReg = this.visitExpression(expr, ctx);

            let inst = fnGetRetType(expr.inferredType!);
            this.i(inst, elementReg, 255 - i);
        }
    }

    ir_generate_return(
        returnExpression: Expression,
        ctx: Context,
        jmpLabel: string | null,
        resTmp: string | null,
        isCoroutine: boolean = false,
    ) {
        if (returnExpression instanceof TupleConstructionExpression) {
            this.ir_generate_tuple_return(ctx, returnExpression);
        } else if (returnExpression.inferredType instanceof TupleType) {
            // we have a function call that returns a tuple
            let tmp = this.visitExpression(returnExpression, ctx);
            this.destroyTmp(tmp);

            // get all the return values
            let tupleType = returnExpression.inferredType.to(
                ctx,
                TupleType,
            ) as TupleType;
            for (let i = 0; i < tupleType.types.length; i++) {
                let tmp = this.generateTmp();
                let read = fnGetRetType(tupleType.types[i]);
                let ret = retType(tupleType.types[i]);
                this.i(read, tmp, 255 - i);
                this.i(ret, tmp, i);
                this.destroyTmp(tmp);
            }
        } else {
            // submit result
            let tmp = this.visitExpression(returnExpression, ctx);
            this.i("debug", "return statement " + tmp);
            if (resTmp) {
                let iType = tmpType(returnExpression.inferredType!);
                this.i(iType, resTmp, "reg", tmp);
            } else {
                let retInst = retType(returnExpression.inferredType!);
                this.i(retInst, tmp, 0);
            }
        }
        // return

        if (jmpLabel) {
            this.i("j", jmpLabel);
        } else if (!isCoroutine) {
            // add a ret void to mark the end of the function
            this.ir_generate_end_ret();
        }
    }

    ir_generate_array_access(expr: IndexAccessExpression, ctx: Context) {
        let inferredType = expr.lhs.inferredType!.dereference();
        let arrayType = inferredType.to(ctx, ArrayType) as ArrayType;
        if (expr.indexes.length != 1) {
            throw new Error(
                "Invalid index access expression, expected 1 index got " +
                    expr.indexes.length,
            );
        }

        // make sure the index is an integer
        if (!expr.indexes[0].inferredType!.is(ctx, BasicType) && !expr.indexes[0].inferredType!.is(ctx, BooleanType) && !expr.indexes[0].inferredType!.is(ctx, EnumType)) {
            throw new Error(
                "Invalid index access expression, expected integer index got " +
                    expr.indexes[0].inferredType?.toString(),
            );
        } else {
            let indexType = expr.indexes[0].inferredType!.to(
                ctx,
                BasicType,
            ) as BasicType;
            if (
                indexType.kind != "u8" &&
                indexType.kind != "u16" &&
                indexType.kind != "u32" &&
                indexType.kind != "u64"
            ) {
                throw new Error(
                    "Invalid index access expression, expected unsigned integer index got " +
                        expr.indexes[0].inferredType?.toString(),
                );
            }
        }

        let indexReg = this.visitExpression(expr.indexes[0], ctx);

        // generate the array
        let reg = this.visitExpression(expr.lhs, ctx);

        this.i("debug", "array index access");
        let instr = arrayGetIndexType(arrayType.arrayOf.dereference());
        let tmp = this.generateTmp();
        this.i(instr, tmp, indexReg, reg);
        this.destroyTmp(reg);
        this.destroyTmp(indexReg);

        return tmp;
    }

    ir_generate_reverse_array_access(expr: ReverseIndexAccessExpression, ctx: Context) {
        let inferredType = expr.lhs.inferredType!.dereference();
        let arrayType = inferredType.to(ctx, ArrayType) as ArrayType;

        // make sure the index is an integer
        if (!expr.index.inferredType!.is(ctx, BasicType)) {
            throw new Error(
                "Invalid index access expression, expected integer index got " +
                    expr.index.inferredType?.toString(),
            );
        } else {
            let indexType = expr.index.inferredType!.to(
                ctx,
                BasicType,
            ) as BasicType;
            if (
                indexType.kind != "u8" &&
                indexType.kind != "u16" &&
                indexType.kind != "u32" &&
                indexType.kind != "u64"
            ) {
                throw new Error(
                    "Invalid index access expression, expected unsigned integer index got " +
                        expr.index.inferredType?.toString(),
                );
            }
        }

        let indexReg = this.visitExpression(expr.index, ctx);

        // generate the array
        let reg = this.visitExpression(expr.lhs, ctx);

        this.i("debug", "array index access");
        let instr = arrayGetReverseIndexType(arrayType.arrayOf.dereference());
        let tmp = this.generateTmp();
        this.i(instr, tmp, indexReg, reg);
        this.destroyTmp(reg);
        this.destroyTmp(indexReg);

        return tmp;
    }

    ir_generate_array_set(
        expr: IndexSetExpression,
        ctx: Context,
        mainExprType: ArrayType,
    ): string {
        this.i("debug", "array index set");
        this.i("debug", "array expression");
        let array_reg = this.visitExpression(expr.lhs, ctx);
        this.i("debug", "array index expression");
        let index_reg = this.visitExpression(expr.indexes[0], ctx);
        this.i("debug", "array value expression");
        let value_reg = this.visitExpression(expr.value, ctx);

        let instr = arraySetIndexType(mainExprType.arrayOf);
        this.i(instr, array_reg, index_reg, value_reg);
        this.destroyTmp(array_reg);
        this.destroyTmp(index_reg);
        this.destroyTmp(value_reg); // TODO: << do we return the value? or the array?
        return value_reg;
    }

    ir_generate_reverse_array_set(
        expr: ReverseIndexSetExpression,
        ctx: Context,
        mainExprType: ArrayType,
    ): string {
        this.i("debug", "reverse array index set");
        this.i("debug", "array expression");
        let array_reg = this.visitExpression(expr.lhs, ctx);
        this.i("debug", "array index expression");
        let index_reg = this.visitExpression(expr.index, ctx);
        this.i("debug", "array value expression");
        let value_reg = this.visitExpression(expr.value, ctx);

        let instr = arraySetReverseIndexType(mainExprType.arrayOf);
        this.i(instr, array_reg, index_reg, value_reg);
        this.destroyTmp(array_reg);
        this.destroyTmp(index_reg);
        this.destroyTmp(value_reg); // TODO: << do we return the value? or the array?
        return value_reg;
    }

    ir_generate_variant_instance_check(
        expr: InstanceCheckExpression,
        ctx: Context,
        reg: string,
        actualType: VariantType,
        castType: DataType,
    ): string {
        // variants are structs with a tag under the hood.
        if (castType instanceof VariantType) {
            throw new Error(
                "Variant -> Variant checks are not yet implemented",
            );
        }

        if (castType instanceof VariantConstructorType) {
            let name = castType.name;
            let constructor = actualType.getConstructor(name);
            if (constructor == null) {
                throw new Error("Unknown constructor " + name);
            }

            let id_reg = this.generateTmp();
            this.i("debug", `Variant -> VariantConstructor "${name}" Check`);
            // offset 0 is the tag
            this.i("s_get_field_u16", id_reg, reg, 0);
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

        throw new Error("Unknown instance check type");
    }

    ir_generate_interface_instance_check(
        expr: InstanceCheckExpression,
        ctx: Context,
        reg: string,
        actualType: DataType,
        castType: DataType,
    ): string {
        var actualTypeInterface = actualType.to(
            ctx,
            InterfaceType,
        ) as InterfaceType;

        if (castType instanceof ClassType) {
            let tmp = this.generateTmp();
            this.i("debug", "Instance -> Class Check");
            this.i("i_is_c", tmp, reg, castType.classId);
            this.destroyTmp(reg);
            return tmp;
        } else {
            // castType has to be an interface
            if (!castType.is(ctx, InterfaceType)) {
                throw new Error(
                    "Expected interface type, got " + castType.getShortName(),
                );
            }

            let castTypeInterface = castType.to(
                ctx,
                InterfaceType,
            ) as InterfaceType;

            // check if they align
            if (actualTypeInterface.interfacesAlign(castTypeInterface)) {
                this.destroyTmp(reg);
                // simply return true
                let tmp = this.generateTmp();
                this.i("const_u8", tmp, 1);
                return tmp;
            } else {
                let failLabel = this.generateLabel();
                let endLabel = this.generateLabel();

                let tmp = this.generateTmp();
                this.i("debug", "Interface -> Interface Check");

                let allMethods = [...castTypeInterface.getMethods()];
                // sort by UID
                allMethods.sort((a, b) => a.getUID() - b.getUID());

                for (let i = 0; i < allMethods.length; i++) {
                    let method = allMethods[i];
                    let methodUID = method.getUID();
                    this.i("i_has_m", methodUID, reg, failLabel);
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

    ir_generate_null_instance_check(
        expr: InstanceCheckExpression,
        ctx: Context,
        reg: string,
        actualType: DataType,
        castType: DataType,
    ): string {
        
        let tmp = this.generateTmp();
        let endLabel = this.generateLabel();
        // assume null
        this.i("const_u8", tmp, 1);
        let jumpInstruction = jCmpNullType(actualType);
        this.i(jumpInstruction, reg, endLabel);
        this.i("const_u8", tmp, 0);
        this.i("label", endLabel);
        
        return tmp;
    }
    
    ir_generate_class_instance_check(
        expr: InstanceCheckExpression,
        ctx: Context,
        reg: string,
        actualType: DataType,
        castType: DataType,
    ): string {
        // castType has to be an interface
        // WRONG: ~if this test has passed, it means that the class implements the interface~
        // or is compatible with the interface

        //// this can be generated by pattern matching too, making the last point in valid
        // hence we need to check
        if (!castType.is(ctx, InterfaceType)) {
            throw new Error("Expected interface type, got " + castType.kind);
        }

        // simply return the result
        this.destroyTmp(reg);
        let tmp = this.generateTmp();
        //let castable = actualType.canCast(castType, ctx).success;
        let castable = canCastTypes(ctx, castType, actualType).success;
        this.i("debug", "Class -> Interface Check");
        this.i("const_u8", tmp, castable ? 1 : 0);

        return tmp;
    }

    ir_generate_enum_access(
        expr: MemberAccessExpression,
        ctx: Context,
        elementName: string,
        sym: DeclaredType,
        type: EnumType,
    ): string {
        // make sure expr.rhs is an element expression
        if (!(expr.right instanceof ElementExpression)) {
            ctx.parser.customError(
                "Expected enum member name after `.`",
                expr.location,
            );
        }
        let field = expr.right.name;
        this.i(
            "debug",
            `enum member access expression: ${elementName}.${field}`,
        );

        let tmp = this.generateTmp();
        let value = type.getFieldValue(ctx, field);

        if (type.as == "unset") {
            throw new Error("Enum type is unresolved");
        }

        let inst = constType(new BasicType(sym.location, type.as));
        this.i(inst, tmp, ""+value);

        return tmp;
    }

    ir_generate_end_ret() {
        if (this.fn.isCoroutineCallable) {
            this.i("throw_rt", 1);
        } else {
            this.i("ret_void");
        }
    }
}

function check_hasReturn(inferredType: DataType | null) {
    if (inferredType instanceof VoidType || inferredType instanceof TupleType) {
        return false;
    }
    return true;
}
