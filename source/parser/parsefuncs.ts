/**
 * Filename: parsefuncs.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     parses the source code into an AST
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { ImportNode } from "../ast/ImportNode";
import { ArrayConstructionExpression, ArrayUnpackingExpression } from "../ast/expressions/ArrayConstructionExpression";
import { BinaryExpression, BinaryExpressionOperator } from "../ast/expressions/BinaryExpression";
import { ElementExpression } from "../ast/expressions/ElementExpression";
import { Expression } from "../ast/expressions/Expression";
import { FunctionCallExpression } from "../ast/expressions/FunctionCallExpression";
import { IfElseExpression } from "../ast/expressions/IfElseExpression";
import { IndexAccessExpression } from "../ast/expressions/IndexAccessExpression";
import { IndexSetExpression } from "../ast/expressions/IndexSetExpression";
import { InstanceCheckExpression } from "../ast/expressions/InstanceCheckExpression";
import { LambdaExpression } from "../ast/expressions/LambdaExpression";
import { LetInExpression } from "../ast/expressions/LetInExpression";
import { MatchCaseExpression, MatchExpression } from "../ast/expressions/MatchExpression";
import { MemberAccessExpression } from "../ast/expressions/MemberAccessExpression";
import { NamedStructConstructionExpression, StructUnpackedElement, StructKeyValueExpressionPair } from "../ast/expressions/NamedStructConstructionExpression";
import { NewExpression } from "../ast/expressions/NewExpression";
import { SpawnExpression } from "../ast/expressions/SpawnExpression";
import { ThisExpression } from "../ast/expressions/ThisExpression";
import { UnaryExpression, UnaryOperator } from "../ast/expressions/UnaryExpression";
import { ArrayPatternExpression } from "../ast/matching/ArrayPatternExpression";
import { ArrayVariablePatternExpression } from "../ast/matching/ArrayVariablePatternExpression";
import { DataTypePatternExpression } from "../ast/matching/DataTypePatternExpression";
import { LiteralPatternExpression } from "../ast/matching/LiteralPatternExpression";
import { StructPatternExpression, StructFieldPattern } from "../ast/matching/StructPatternExpression";
import { ClassMethod } from "../ast/other/ClassMethod";
import { FunctionPrototype } from "../ast/other/FunctionPrototype";
import { InterfaceMethod } from "../ast/other/InterfaceMethod";
import { BlockStatement } from "../ast/statements/BlockStatement";
import { BreakStatement } from "../ast/statements/BreakStatement";
import { ContinueStatement } from "../ast/statements/ContinueStatement";
import { DoWhileStatement } from "../ast/statements/DoWhileStatement";
import { ExpressionStatement } from "../ast/statements/ExpressionStatement";
import { ForeachStatement } from "../ast/statements/ForeachStatement";
import { IfStatement } from "../ast/statements/IfStatement";
import { MatchStatement } from "../ast/statements/MatchStatement";
import { ReturnStatement } from "../ast/statements/ReturnStatement";
import { Statement } from "../ast/statements/Statement";
import { WhileStatement } from "../ast/statements/WhileStatement";
import { ClassAttribute } from "../ast/other/ClassAttribute";
import { Context } from "../ast/symbol/Context";
import { DeclaredFFI } from "../ast/symbol/DeclaredFFI";
import { DeclaredType } from "../ast/symbol/DeclaredType";
import { FunctionArgument } from "../ast/symbol/FunctionArgument";
import { ArrayType } from "../ast/types/ArrayType";
import { BasicType, BasicTypeKind } from "../ast/types/BasicType";
import { BooleanType } from "../ast/types/BooleanType";
import { ClassType } from "../ast/types/ClassType";
import { DataType } from "../ast/types/DataType";
import { EnumField, EnumTargetType, EnumType } from "../ast/types/EnumType";
import { FFIMethodType } from "../ast/types/FFIMethodType";
import { FunctionType } from "../ast/types/FunctionType";
import { GenericType, GenericTypeConstraint } from "../ast/types/GenericType";
import { InterfaceType } from "../ast/types/InterfaceType";
import { JoinType } from "../ast/types/JoinType";
import { NullType } from "../ast/types/NullType";
import { NullableType } from "../ast/types/NullableType";
import { ReferenceType } from "../ast/types/ReferenceType";
import { StructField, StructType } from "../ast/types/StructType";
import { UnionType } from "../ast/types/UnionType";
import { UnsetType } from "../ast/types/UnsetType";
import { VariantConstructorType, VariantParameter } from "../ast/types/VariantConstructorType";
import { VariantType } from "../ast/types/VariantType";
import { VoidType } from "../ast/types/VoidType";
import { Parser } from "./Parser";
import { WildCardPatternExpression } from "../ast/matching/WildCardPatternExpression";
import { CastExpression } from "../ast/expressions/CastExpression";
import { UnnamedStructConstructionExpression } from "../ast/expressions/UnnamedStructConstructionExpression";
import { DeclaredVariable } from "../ast/symbol/DeclaredVariable";
import { PatternExpression } from "../ast/matching/PatternExpression";
import { VariablePatternExpression } from "../ast/matching/VariablePatternExpression";
import { StructVariablePatternExpression } from "../ast/matching/StructVariablePatternExpression";
import { VariableDeclarationStatement } from "../ast/statements/VariableDeclarationStatement";
import { ForStatement } from "../ast/statements/ForStatement";
import { FunctionDeclarationStatement } from "../ast/statements/FunctionDeclarationStatement";
import { DeclaredFunction } from "../ast/symbol/DeclaredFunction";
import { PromiseType } from "../ast/types/PromiseType";
import { LockType } from "../ast/types/LockType";
import { AwaitExpression } from "../ast/expressions/AwaitExpression";
import { TupleType } from "../ast/types/TupleType";
import { TupleConstructionExpression } from "../ast/expressions/TupleConstructionExpression";
import { TokenType } from "../lexer/TokenType";
import { IntLiteralExpression, LiteralExpression, TrueLiteralExpression } from "../ast/expressions/LiteralExpression";
import { TupleDeconstructionExpression } from "../ast/expressions/TupleDeconstructionExpression";
import { CoroutineType } from "../ast/types/CoroutineType";
import { CoroutineConstructionExpression } from "../ast/expressions/CoroutineConstructionExpression";
import { DoExpression } from "../ast/expressions/DoExpression";
import { ArrayDeconstructionExpression } from "../ast/expressions/ArrayDeconstructionExpression";
import { StructDeconstructionExpression } from "../ast/expressions/StructDeconstructionExpression";



let INTIALIZER_GROUP_ID = 1;

// <genericArgDecl> ::= "<" id (":" <type>)? ("," id (":" <type>)?)+ ">" 
function parseGenericArgDecl(parser: Parser, ctx: Context): GenericType[] {
    let generics: GenericType[] = [];

    parser.expect("<");
    let loop = true;

    while (loop) {
        let loc = parser.loc();
        let token = parser.expect("identifier");
        let next = parser.peek();
        if (next.type === ":") {
            parser.accept();
            let type = parseTypeUnion(parser, ctx);
            generics.push(new GenericType(loc, token.value, new GenericTypeConstraint(type)));
        }
        else {
            parser.reject();
            // make sure generic doesn"t already exist
            if (generics.find((g) => g.name == token.value)) {
                //throw new Error(`Generic "${token.value}" already exists`);
                throw parser.error(`Generic "${token.value}" already exists in list`);
            }
            generics.push(new GenericType(loc, token.value, new GenericTypeConstraint(null)));
        }

        let current = parser.peek();
        if (current.type === ",") {
            parser.accept();
        }
        else {
            parser.reject();
            loop = false;
        }
    }

    parser.expect(">");
    return generics;
}

function parseTypeList(parser: Parser, ctx: Context): DataType[] {
    const types: DataType[] = [];
    let loop = true;
    while (loop) {
        const type = parseType(parser, ctx);
        types.push(type);
        const token = parser.peek();
        if (token.type === ",") {
            parser.accept();
        }
        else {
            parser.reject();
            loop = false;
        }
    }
    return types;
}

/**
 * Parses Struct 
 * @param parser 
 * @param ctx 
 * @param allowDuplicatedNames allows duplicated, set to false for structs, true for variants
 * @returns 
 */
function parseStructFields(parser: Parser, ctx: Context, allowDuplicatedNames = false): StructField[] {
    let canLoop = true;
    let fields: StructField[] = [];
    while (canLoop) {
        let loc = parser.loc();
        let id = parser.expect("identifier");
        parser.expect(":");
        let type = parseType(parser, ctx);
        // make sure no fields are duplicated
        if (!allowDuplicatedNames) {
            if (fields.find((f) => f.name == id.value)) {
                throw parser.error(`Duplicate field "${id.value}" in struct`, id.location);
            }
        }

        fields.push(new StructField(loc, id.value, type));
        let token = parser.peek();
        canLoop = token.type === ",";
        if (canLoop) {
            parser.accept();
        }
        else {
            parser.reject();
        }
    }

    return fields;
}


/**
 * Parses Variant Parameters, same as struct fields but for variants
 * @param parser 
 * @param ctx 
 * @param allowDuplicatedNames allows duplicated, set to false for structs, true for variants
 * @returns 
 */
function parseVariantParams(parser: Parser, ctx: Context, allowDuplicatedNames = false): StructField[] {
    let canLoop = true;
    let fields: VariantParameter[] = [];
    while (canLoop) {
        let loc = parser.loc();
        let id = parser.expect("identifier");
        parser.expect(":");
        let type = parseType(parser, ctx);
        // make sure no fields are duplicated
        if (!allowDuplicatedNames) {
            if (fields.find((f) => f.name == id.value)) {
                throw parser.error(`Duplicate field "${id.value}" in struct`, id.location);
            }
        }

        fields.push(new VariantParameter(loc, id.value, type));
        let token = parser.peek();
        canLoop = token.type === ",";
        if (canLoop) {
            parser.accept();
        }
        else {
            parser.reject();
        }
    }

    return fields;
}

function parseVariantConstructor(parser: Parser, ctx: Context): VariantConstructorType[] {
    let constructors: VariantConstructorType[] = [];
    let canLoop = true;

    while (canLoop) {
        let loc = parser.loc();
        const constructorTok = parser.expect("identifier");
        const constructorName = constructorTok.value;
        parser.expect("(");
        let fields: VariantParameter[] = [];
        let lexeme = parser.peek();
        parser.reject();
        if (lexeme.type === ")") {
            parser.reject();
        }
        else {
            fields = parseVariantParams(parser, ctx, true);
        }

        parser.expect(")");
        // make sure constructor name doesnt exist already
        if (constructors.find((c) => c.name == constructorName)) {
            throw parser.error(
                `Duplicate constructor "${constructorName}" in variant`,
                constructorTok.location
            );
        }
        constructors.push(new VariantConstructorType(loc, constructorName, fields));
        const token = parser.peek();
        canLoop = token.type === ",";
        if (canLoop) {
            parser.accept();
        }
        else {
            parser.reject();
        }
    }

    return constructors;
}

function parseFunctionPrototype(parser: Parser, ctx: Context): FunctionPrototype {
    let loc = parser.loc();
    parser.expect("fn");
    let name = parser.expect("identifier").value;
    let generics: GenericType[] = []

    let lexeme = parser.peek();
    parser.reject();
    if (lexeme.type === "<") {
        generics = parseGenericArgDecl(parser, ctx);
    }

    let header = parseFnTypeBody(parser, ctx);
    return new FunctionPrototype(loc, name, header, generics);
}


function parseProcessFunctionPrototype(parser: Parser, ctx: Context): { proto: FunctionPrototype, isEvent: boolean } {
    let loc = parser.loc();
    parser.expect("fn");
    let tok = parser.peek();
    let isEvent: boolean = false;

    if (tok.value === "on") {
        parser.accept();
        isEvent = true;
        parser.expect(":");
    }
    let name = parser.expect("identifier").value;

    let generics: GenericType[] = []

    let lexeme = parser.peek();
    parser.reject();
    if (lexeme.type === "<") {
        generics = parseGenericArgDecl(parser, ctx);
    }

    let header = parseFnTypeBody(parser, ctx);
    return { proto: new FunctionPrototype(loc, name, header, generics), isEvent };
}

function parseMethodInterface(parser: Parser, ctx: Context): InterfaceMethod {
    let loc = parser.loc();
    let isStatic = false;
    let token = parser.peek();
    if (token.type === "static") {
        parser.accept();
        isStatic = true;
    }
    else {
        parser.reject();
    }

    let fnProto = parseFunctionPrototype(parser, ctx);

    return new InterfaceMethod(loc, fnProto.name, fnProto.header, isStatic, fnProto.generics);
}

// parses fn body starting from parenthesis "(" <args> ")" ("->" <type>)?
function parseFnTypeBody(parser: Parser, ctx: Context): FunctionType {
    let fnLoc = parser.loc();
    parser.expect("(");
    let lexeme = parser.peek();
    let canLoop = lexeme.type === "identifier" || lexeme.type === "mut";
    parser.reject();
    let parameters: FunctionArgument[] = [];
    let returnType: DataType = new UnsetType(fnLoc);

    while (canLoop) {
        let isMut = false;
        let token = parser.peek();
        if (token.type === "mut") {
            parser.accept();
            isMut = true;
        }
        else {
            parser.reject();
        }
        let loc = parser.loc();
        let id = parser.expect("identifier");
        parser.expect(":");
        let type = parseType(parser, ctx);
        // make sure  parameter doesnt exist already
        if (parameters.find((p) => p.name == id.value)) {
            throw parser.error(`Duplicate parameter "${id.value}" in function`, id.location);
        }
        parameters.push(new FunctionArgument(loc, id.value, type, isMut));

        token = parser.peek();
        canLoop = token.type === ",";
        if (canLoop) {
            parser.accept();
        }
        else {
            parser.reject();
        }
    }
    parser.expect(")");

    lexeme = parser.peek();
    if (lexeme.type === "->") {
        parser.accept();
        returnType = parseType(parser, ctx);
    }
    else {
        parser.reject();
    }

    // make sure we have at maximum 255 parameters
    if (parameters.length > 255) {
        throw parser.error(`Function cannot have more than 255 parameters, ${parameters.length} found`, { line: fnLoc.line, col: fnLoc.col, pos: fnLoc.pos });
    }
    return new FunctionType(fnLoc, parameters, returnType);
}

// parses <id>(.<id>)*
function parsePackageReference(parser: Parser, ctx: Context): string[] {
    let id = parser.expect("identifier");
    let basePath = [id.value];

    let token = parser.peek();
    while (token.type === ".") {
        parser.accept();
        token = parser.expect("identifier");
        basePath.push(token.value);
        token = parser.peek();
    }
    parser.reject();

    return basePath;
}

/**
 * <import> ::= "import" <id> ("." <id>)* ("as" <id>)?
 */
function parseImport(parser: Parser) {
    let loc = parser.loc();
    parser.expect("import");

    // now we expect an identifier
    let id = parser.expectPackageName();

    let basePath = [id.value];

    let token = parser.peek();
    while (token.type === ".") {
        parser.accept();
        token = parser.expectPackageName();
        basePath.push(token.value);
        token = parser.peek();
    }

    let actualName = basePath.pop() as string;
    let alias = actualName;

    if (token.type === "as") {
        parser.accept();
        token = parser.expectPackageName();
        alias = token.value;
        parser.accept();
    }
    else {
        parser.reject();
    }

    parser.basePackage.addImport(new ImportNode(loc, basePath, actualName, alias));
}


/**
 * "<from_import> ::= "from" <id> ("." <id>)* import <id> ("as" <id>)?
 */
function parseFrom(parser: Parser) {
    let loc = parser.loc();
    parser.expect("from");
    // now we expect an identifier
    let id = parser.expectPackageName();

    const basePath = [id.value];

    let token = parser.peek();
    while (token.type === ".") {
        parser.accept();
        token = parser.expectPackageName();
        basePath.push(token.value);
        token = parser.peek();
    }

    parser.reject();
    parser.expect("import");

    // from here we expect
    // <pkg> ("as" <id>)? "," (<pkg> ("as" <id>)?)*

    let canReadPackage = true;

    while (canReadPackage) {
        const id = parser.expectPackageName();
        const postPath = [id.value]
        let canLoop = parser.peek().type === ".";
        if (canLoop) {
            parser.accept();
            let token = parser.expectPackageName();
            postPath.push(token.value);
            canLoop = parser.peek().type === ".";
        }

        parser.reject();
        let actualName = postPath.pop() as string;
        let alias = actualName;

        const tok = parser.peek();
        if (tok.type === "as") {
            parser.accept();
            alias = parser.expectPackageName().value;
        }
        else {
            parser.reject();
        }

        parser.basePackage.addImport(new ImportNode(loc, basePath.concat(postPath), actualName, alias));

        const tok2 = parser.peek();
        if (tok2.type === ",") {
            parser.accept();
        }
        else {
            parser.reject();
            canReadPackage = false;
        }
    }

    token = parser.peek();
    if (token.type === ";") {
        parser.accept();
    }
    else {
        parser.reject();
    }
}

/**
 * FFI
 */
function parseFFI(parser: Parser) {
    parser.expect("extern");
    let nameTok = parser.expect("identifier");
    parser.expect("from");
    let string = parser.expect("string_literal").value;
    // remove quotes
    string = string.slice(1, string.length - 1);
    parser.expect("=");
    parser.expect("{");
    let tok = parser.peek();
    let canLoop = tok.type != "}";
    let methods: FFIMethodType[] = [];
    while (canLoop) {
        let method = parseMethodInterface(parser, parser.basePackage.ctx);
        // make sure no duplicate methods
        if (methods.find(m => method.name == m.imethod.name)) {
            throw parser.customError(`Duplicate method "${method.name}" in FFI`, method.location);
        }
        methods.push(new FFIMethodType(method.location, method));
        tok = parser.peek();
        canLoop = tok.type != "}";
        parser.reject();
    }
    parser.expect("}");

    let ffi = new DeclaredFFI(nameTok.location, nameTok.value, string, methods);
    parser.basePackage.addFFI(ffi);
}

/**
 * Data Types
 */
// <type_decl> ::= "type" <identifier> <generic_arg_decl> "=" <type>
function parseTypeDecl(parser: Parser) {
    let loc = parser.loc();
    let typeToken = parser.expect("type");

    const name = parser.expect("identifier").value;
    let generics: GenericType[] = []

    let token = parser.peek();
    if (token.type === "<") {
        parser.reject();
        generics = parseGenericArgDecl(parser, parser.basePackage.ctx);
    }
    else {
        parser.reject();
    }

    token = parser.expect("=");
    const type = parseType(parser, parser.basePackage.ctx);

    /**
     * if the type is not generic, we resolve it right away, otherwise, 
     * we resolve it once it is used (i.e concrete types has been provided)
     */

    let declaredType = new DeclaredType(loc, parser.basePackage.ctx, name, type, generics, parser.basePackage.ctx.getCurrentPackage());

    /*
    Postpone type resolution for when used or import or later, because some symbols might not be resolved yet
    if(!declaredType.isGeneric()) {
        declaredType.type.resolve(parser.basePackage.ctx);
    }
    */

    parser.basePackage.addType(declaredType);
}

function parseType(parser: Parser, ctx: Context): DataType {
    let loc = parser.loc();
    let typeDefinition = parseTypeIntersection(parser, ctx)

    let lexeme = parser.peek();
    if (lexeme.type === "?") {
        parser.accept();
        typeDefinition = new NullableType(loc, typeDefinition);
    }
    else {
        parser.reject();
    }
    return typeDefinition;
}

function parseTypeUnion(parser: Parser, ctx: Context): DataType {
    //throw new Error("Unions are not implemented in this version of type-c");

    let loc = parser.loc();
    let left = parseTypeIntersection(parser, ctx);
    let lexeme = parser.peek();
    if (lexeme.type === "|") {
        parser.accept();
        let right = parseTypeUnion(parser, ctx);
        let type = new UnionType(loc, left, right);
        return type;
    }
    parser.reject();
    return left;

}

function parseTypeIntersection(parser: Parser, ctx: Context): DataType {
    let loc = parser.loc();
    let left = parseTypeArray(parser, ctx);
    let lexeme = parser.peek();
    if (lexeme.type === "&") {
        parser.accept();
        let right = parseType(parser, ctx);
        let type = new JoinType(loc, left, right);
        return type;
    }
    parser.reject();
    return left;
}

function parseTypeArray(parser: Parser, ctx: Context): DataType {
    let loc = parser.loc();
    let type = parseTypeGroup(parser, ctx);
    let lexeme = parser.peek();
    if (lexeme.type === "[") {
        let canLoop = true;
        while (canLoop) {
            parser.accept();
            parser.expect("]");
            type = new ArrayType(loc, type);
            lexeme = parser.peek();
            canLoop = lexeme.type === "[";
        }
        parser.reject();
        return type;
    }
    parser.reject();
    return type;
}

function parseTypeGroup(parser: Parser, ctx: Context): DataType {
    let loc = parser.loc();
    let lexeme = parser.peek();
    let type: DataType | null = null;

    if (lexeme.type === "(") {
        parser.accept();
        // type = parseType(parser, ctx);
        let types = parseTypeList(parser, ctx);

        if (types.length > 1) {
            type = new TupleType(loc, types);
        }
        else {
            type = types[0];
        }
        parser.expect(")");
    }
    else {
        parser.reject();
        type = parseTypePrimary(parser, ctx);
    }

    lexeme = parser.peek();
    if (lexeme.type === "?") {
        parser.accept();
        type = new NullableType(loc, type);
    }
    else {
        parser.reject();
    }

    return type;
}

function parseTypePrimary(parser: Parser, ctx: Context): DataType {
    let loc = parser.loc();
    let lexeme = parser.peek();
    if (lexeme.type === "identifier") {
        parser.reject();
        return parseTypeReference(parser, ctx);
    }
    if (lexeme.type === "enum") {
        parser.reject();
        return parseTypeEnum(parser, ctx);
    }

    if (lexeme.type === "struct" || lexeme.type === "{") {
        parser.reject();
        return parseTypeStruct(parser, ctx);
    }

    if (lexeme.type === "variant") {
        parser.reject();
        return parseTypeVariant(parser, ctx);
    }

    if (lexeme.type === "interface") {
        parser.reject();
        return parseTypeInterface(parser, ctx);
    }

    if (lexeme.type === "fn") {
        parser.reject();
        return parseTypeFunction(parser, ctx);
    }

    if (lexeme.type === "class") {
        parser.reject();
        return parseTypeClass(parser, ctx);
    }

    if (lexeme.type === "coroutine") {
        parser.reject();
        return parseTypeCoroutine(parser, ctx);
    }

    /*
    if(lexeme.type === "process") {
        parser.reject();
        return parseTypeProcess(parser, ctx);
    }
    */

    if (["u8", "u16", "u32", "u64", "i8", "i16", "i32", "i64", "f32", "f64"].includes(lexeme.type)) {
        parser.accept();
        return new BasicType(loc, lexeme.type as BasicTypeKind);
    }

    if (lexeme.type === "void") {
        parser.accept();
        return new VoidType(loc);
    }

    if (lexeme.type === "bool") {
        parser.accept();
        return new BooleanType(loc);
    }

    if (lexeme.type === "null") {
        parser.accept();
        return new NullType(loc);
    }

    if (lexeme.type === "promise") {
        parser.accept();
        parser.expect("<");
        let type = parseType(parser, ctx);
        parser.expect(">");
        return new PromiseType(loc, type);
    }

    if (lexeme.type === "lock") {
        parser.accept();
        // sometimes the lock type is not specified, in that case, we use unset
        let lockType = new UnsetType(loc);
        if (parser.peek().type == "<") {
            parser.accept();
            lockType = parseType(parser, ctx);
            parser.expect(">");
        }

        return new LockType(loc, lockType);
    }

    throw parser.customError(`Unexpected token "${lexeme.type}"`, loc);
}

function parseTypeCoroutine(parser: Parser, ctx: Context): DataType {
    let loc = parser.loc();
    parser.expect("coroutine");
    parser.expect("<");
    let fnType = parseTypeFunction(parser, ctx);
    parser.expect(">");
    return new CoroutineType(loc, fnType as FunctionType);
}

function parseTypeEnum(parser: Parser, ctx: Context): DataType {
    let loc = parser.loc();
    parser.expect("enum");
    let lexeme = parser.peek();
    let base: EnumTargetType = "unset";

    if (lexeme.type === "as") {
        parser.accept();
        let base_str = parseType(parser, ctx).kind;
        if (["u8", "u16", "u32", "u64", "i8", "i16", "i32", "i64"].includes(base_str)) {
            base = base_str as EnumTargetType;
        }
        else {
            throw parser.customError(`Unexpected enum base type "${base_str}", must be a valid datatype`, loc);
        }
    }
    else {
        parser.reject();
    }

    parser.expect("{");
    let canLoop = true;
    let values: EnumField[] = [];
    while (canLoop) {
        let id = parser.expect("identifier");
        lexeme = parser.peek();

        if (lexeme.type === "=") {
            parser.accept();
            let vtok = parser.peek();
            if (["int_literal", "binary_int_literal", "oct_int_literal", "hex_int_literal"].includes(vtok.type)) {
                let value = vtok.value;
                values.push(new EnumField(id.location, id.value, value, vtok.type as "int_literal" | "binary_int_literal" | "oct_int_literal" | "hex_int_literal"));
            }
            else {
                throw parser.customError(`Unexpected enum value "${vtok.type}", must be an integer (dec, bin, oct, hex) literal`, vtok.location);
            }
        }
        else {
            parser.reject();
            values.push(new EnumField(id.location, id.value));
        }

        lexeme = parser.peek();
        canLoop = lexeme.type === ",";
        if (canLoop) {
            parser.accept();
        }
        else {
            parser.reject();
        }
    }
    parser.expect("}");

    return new EnumType(loc, values, base);
}

function parseTypeReference(parser: Parser, ctx: Context): DataType {
    //const refName = parser.expect("identifier").value;
    let loc = parser.loc();
    let ref = parsePackageReference(parser, ctx);
    let lexeme = parser.peek();
    if (lexeme.type === "<") {
        parser.accept();
        const types = parseTypeList(parser, ctx);
        parser.expect(">");
        return new ReferenceType(loc, ref, types, ctx);
    }
    else {
        parser.reject();
    }

    return new ReferenceType(loc, ref, [], ctx);
}

function parseTypeStruct(parser: Parser, ctx: Context): DataType {
    let loc = parser.loc();
    let lexeme = parser.peek();
    parser.reject();
    if (lexeme.type === "struct") {
        parser.expect("struct");
    }
    parser.expect("{");
    let fields = parseStructFields(parser, ctx);
    let type = new StructType(loc, fields);
    parser.expect("}");
    return type;
}

function parseTypeVariant(parser: Parser, ctx: Context): DataType {
    let loc = parser.loc();
    parser.expect("variant");
    parser.expect("{");
    let constructors = parseVariantConstructor(parser, ctx);
    parser.expect("}");
    let type = new VariantType(loc, constructors);
    return type;
}

function parseTypeInterface(parser: Parser, ctx: Context): DataType {
    let loc = parser.loc();
    parser.expect("interface");
    let superTypes: DataType[] = []
    let lexeme = parser.peek();
    if (lexeme.type != "{") {
        parser.reject();
        superTypes = parseTypeList(parser, ctx);
    }
    else {
        parser.reject();
    }

    parser.expect("{");
    let canLoop = true;
    let methods: InterfaceMethod[] = [];

    while (canLoop) {
        let method = parseMethodInterface(parser, ctx);
        // in interfaces, replace unset with void
        if (method.header.returnType.kind == "unset") {
            method.header.returnType = new VoidType(method.header.returnType.location);
        }
        if (method.isStatic) {
            throw parser.customError("Interfaces cannot have static methods", method.location);
        }

        methods.push(method);
        lexeme = parser.peek();
        canLoop = lexeme.type != "}";
        parser.reject();
    }

    parser.expect("}");

    // assert all superTypes are reference types
    for (let t of superTypes) {
        if (!(t instanceof ReferenceType)) {
            throw ctx.parser.customError("Interfaces can only inherit from other interfaces", loc);
        }
    }

    // make sure no method is called init, if found throw error at its location
    methods.forEach(method => {
        if (method.name == "init") {
            throw ctx.parser.customError("Interfaces cannot have methods called init", method.location);
        }
    })

    return new InterfaceType(loc, methods, superTypes as ReferenceType[]);
}

function parseTypeClass(parser: Parser, ctx: Context): ClassType {
    let loc = parser.loc();
    parser.expect("class");
    let superTypes: DataType[] = []
    let lexeme = parser.peek();
    if (lexeme.type != "{") {
        parser.reject();
        superTypes = parseTypeList(parser, ctx);
    }
    else {
        parser.reject();
    }
    parser.expect("{");

    let canLoop = true;
    let attributes: ClassAttribute[] = [];
    let methods: ClassMethod[] = [];
    let staticBlock: BlockStatement | null = null;

    while (canLoop) {
        let tok = parser.peek();
        if (tok.type === "let") {
            parser.reject();
            let attribute = parseClassAttribute(parser, ctx);
            if (methods.find(m => m.imethod.name == attribute.name)) {
                throw parser.customError(`Duplicate attribute "${attribute.name}" in class`, attribute.location);
            }
            // also comapre it with attributes
            if (attributes.find(a => a.name == attribute.name)) {
                throw parser.customError(`Duplicate name attributes "${attribute.name}" is already reserved by a method, in class`, attribute.location);
            }
            attributes.push(attribute);
        }
        else if (tok.type === "static") {
            let tok2 = parser.peek();
            if (tok2.type === "{") {
                // Static block
                // make sure we don"t have more than one static block
                if (staticBlock != null) {
                    throw parser.customError("Duplicate static block in class, can only have one", tok.location);
                }
                parser.rejectOne();
                parser.accept();
                staticBlock = parseStatementBlock(parser, ctx);
            }
            else if (tok2.type === "fn") {
                parser.reject();
                let method = parseClassMethod(parser, ctx);
                method.imethod.isStatic = true;

                // also comapre it with attributes
                if (attributes.find(a => a.name == method.imethod.name)) {
                    throw parser.customError(`Duplicate name method "${method.imethod.name}" is already reserved by an attribute, in class`, method.location);
                }
                methods.push(method);
            }
        }
        else if (tok.type === "fn") {
            parser.reject();
            let method = parseClassMethod(parser, ctx);
            // also comapre it with attributes
            if (attributes.find(a => a.name == method.imethod.name)) {
                throw parser.customError(`Duplicate name method "${method.imethod.name}" is already reserved by an attribute, in class`, method.location);
            }
            methods.push(method);
        }
        else {
            parser.reject();
            canLoop = false;
        }
    }

    parser.expect("}");

    return new ClassType(loc, superTypes as ReferenceType[], attributes, methods);
}

function parseTypeFunction(parser: Parser, ctx: Context): DataType {
    parser.expect("fn");
    let header = parseFnTypeBody(parser, ctx);
    // if the return type is unset, we change it to void (since it"s a function type)
    if (header.returnType.kind == "unset") {
        header.returnType = new VoidType(header.returnType.location);
    }
    return header;
}

function parseClassAttribute(parser: Parser, ctx: Context): ClassAttribute {
    let loc = parser.loc();
    parser.expect("let");

    let tok = parser.peek();
    let isStatic = tok.type === "static";
    if (isStatic) {
        parser.accept();
    }
    else {
        parser.reject();
    }

    let id = parser.expect("identifier");
    parser.expect(":");
    let type = parseType(parser, ctx);
    return new ClassAttribute(loc, id.value, type, isStatic);
}

function parseClassMethod(parser: Parser, ctx: Context, classOrProcessMethod = "class"): ClassMethod {
    let loc = parser.loc();

    let fnProto = parseMethodInterface(parser, ctx);
    let body: BlockStatement | null = null;
    let expression: Expression | null = null;

    // create method ctx and capture return statements
    let methodScope = new Context(loc, parser, ctx, { withinClass: classOrProcessMethod == "class", withinFunction: true });
    methodScope.location = loc;

    let fn = new ClassMethod(loc, methodScope, fnProto, null, null)
    methodScope.setOwner(fn);

    if (parser.peek().type === "=") {
        parser.accept();
        expression = parseExpression(parser, methodScope);
    }
    else {
        parser.reject();
        body = parseStatementBlock(parser, methodScope);
    }

    fn.expression = expression;
    fn.body = body;
    return fn;
}

/**
 * Expressions
 */



function parseExpression(parser: Parser, ctx: Context): Expression {
    return parseExpressionLet(parser, ctx);
}

function parseExpressionLet(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let lexeme = parser.peek();
    if (lexeme.type === "let") {
        parser.accept();
        // create new ctx in which to register new variables
        // and parse <in> expression 
        let newScope = new Context(loc, parser, ctx);
        newScope.location = loc;
        let variables = parseVariableDeclarationList(parser, newScope);
        parser.expect("in");
        let body = parseExpression(parser, newScope);
        return new LetInExpression(loc, newScope, variables, body);
    }
    else {
        parser.reject();
        return parseExpressionMatch(parser, ctx);
    }
}

function parseExpressionMatch(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let lexeme = parser.peek();
    if (lexeme.type === "match") {
        parser.accept();
        let expression = parseExpression(parser, ctx);
        parser.expect("{");
        let cases: MatchCaseExpression[] = parseMatchCases(parser, ctx, "expr");

        // make sure we have at least one case
        if (cases.length == 0) {
            throw parser.customError("Match expression must have at least one case", loc);
        }

        // make sure we always have a default case, as the last case
        let lastCase = cases[cases.length - 1];
        if (!(lastCase.pattern instanceof WildCardPatternExpression)) {
            throw parser.customError("Match expression must have a default wild case expression as last case", loc);
        }


        parser.expect("}");
        return new MatchExpression(loc, expression, cases);
    }
    else {
        parser.reject();
        return parseExpressionOpAssign(parser, ctx);
    }
}

// =, +=, -=, *=, /=, %=
function parseExpressionOpAssign(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let left = parseExpressionConditional(parser, ctx);
    let lexeme = parser.peek();
    if (lexeme.type === "=" || lexeme.type === "+=" || lexeme.type === "-=" || lexeme.type === "*=" || lexeme.type === "/=" || lexeme.type === "%=") {
        parser.accept();
        let right = parseExpressionOpAssign(parser, ctx);

        if (lexeme.type === "=") {
            if (left.kind === "index_access") {
                let indexAccess = left as IndexAccessExpression;
                return new IndexSetExpression(loc, indexAccess.lhs, indexAccess.indexes, right);
            }
        }

        return new BinaryExpression(loc, left, right, lexeme.type as BinaryExpressionOperator);
    }
    parser.reject();
    return left;
}

// if.., if .. else
function parseExpressionConditional(parser: Parser, ctx: Context): Expression {
    let lexeme = parser.peek();
    if (lexeme.type === "if") {
        let loc = parser.loc();
        parser.accept();

        let ifs: Expression[] = [];
        let bodies: Expression[] = [];

        let canLoop = true;
        while (canLoop) {
            let loc = parser.loc();
            let condition = parseExpression(parser, ctx);

            ifs.push(condition);
            parser.expect("=>");

            let body = parseExpression(parser, ctx);
            bodies.push(body);

            lexeme = parser.peek();
            canLoop = lexeme.type === "else";
            let nextLexeme = parser.peek();
            canLoop = canLoop && (nextLexeme.type === "if");
            if (canLoop) {
                parser.accept();
            }
            else {
                parser.reject();
            }
        }
        parser.expect("else");
        let elseBody = parseExpression(parser, ctx);
        return new IfElseExpression(loc, ifs, bodies, elseBody);
    }
    else {
        parser.reject();
        return parseCoalescingOp(parser, ctx);
    }
}


// ||
function parseCoalescingOp(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let left = parseExpressionLogicalOr(parser, ctx);
    let lexeme = parser.peek();

    while (lexeme.type === "??") {
        parser.accept();
        let right = parseExpressionLogicalOr(parser, ctx);
        left = new BinaryExpression(loc, left, right, lexeme.type as BinaryExpressionOperator);
        lexeme = parser.peek();
    }

    parser.reject();
    return left;
}

// ||
function parseExpressionLogicalOr(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let left = parseExpressionLogicalAnd(parser, ctx);
    let lexeme = parser.peek();

    while (lexeme.type === "||") {
        parser.accept();
        let right = parseExpressionLogicalAnd(parser, ctx);
        left = new BinaryExpression(loc, left, right, lexeme.type as BinaryExpressionOperator);
        lexeme = parser.peek();
    }

    parser.reject();
    return left;
}

// &&
function parseExpressionLogicalAnd(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let left = parseExpressionBitwiseInclusiveOr(parser, ctx);
    let lexeme = parser.peek();

    while (lexeme.type === "&&") {
        parser.accept();
        let right = parseExpressionBitwiseInclusiveOr(parser, ctx);
        left = new BinaryExpression(loc, left, right, lexeme.type as BinaryExpressionOperator);
        lexeme = parser.peek();
    }

    parser.reject();
    return left;
}


// |
function parseExpressionBitwiseInclusiveOr(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let left = parseExpressionBitwiseXOR(parser, ctx);
    let lexeme = parser.peek();

    while (lexeme.type === "|") {
        parser.accept();
        let right = parseExpressionBitwiseXOR(parser, ctx);
        left = new BinaryExpression(loc, left, right, lexeme.type as BinaryExpressionOperator);
        lexeme = parser.peek();
    }

    parser.reject();
    return left;
}

// ^
function parseExpressionBitwiseXOR(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let left = parseExpressionBitwiseAND(parser, ctx);
    let lexeme = parser.peek();

    while (lexeme.type === "^") {
        parser.accept();
        let right = parseExpressionBitwiseAND(parser, ctx);
        left = new BinaryExpression(loc, left, right, lexeme.type as BinaryExpressionOperator);
        lexeme = parser.peek();
    }

    parser.reject();
    return left;
}

function parseExpressionBitwiseAND(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let left = parseExpressionEquality(parser, ctx);
    let lexeme = parser.peek();

    while (lexeme.type === "&") {
        parser.accept();
        let right = parseExpressionEquality(parser, ctx);
        left = new BinaryExpression(loc, left, right, lexeme.type as BinaryExpressionOperator);
        lexeme = parser.peek();
    }

    parser.reject();
    return left;
}

// ==, !=
function parseExpressionEquality(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let left = parseExpressionRelational(parser, ctx);
    let lexeme = parser.peek();

    while (lexeme.type === "==" || lexeme.type === "!=") {
        parser.accept();
        let right = parseExpressionRelational(parser, ctx);
        left = new BinaryExpression(loc, left, right, lexeme.type as BinaryExpressionOperator);
        lexeme = parser.peek();
    }

    parser.reject();
    return left;
}

// <, <=, >, >=
function parseExpressionRelational(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let left = parseExpressionShift(parser, ctx);
    let lexeme = parser.peek();

    // Use a while loop to handle sequences of relational operations
    while (lexeme.type === "<" || lexeme.type === "<=" || lexeme.type === ">" || lexeme.type === ">=") {
        parser.accept();
        let right = parseExpressionShift(parser, ctx);
        left = new BinaryExpression(loc, left, right, lexeme.type as BinaryExpressionOperator);
        lexeme = parser.peek();
    }

    parser.reject();
    return left;
}

// <<, >>
function parseExpressionShift(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let left = parseExpressionAdditive(parser, ctx);
    let lexeme = parser.peek();

    while (lexeme.type === "<<" || lexeme.type === ">>") {
        parser.accept();
        let right = parseExpressionAdditive(parser, ctx);
        left = new BinaryExpression(loc, left, right, lexeme.type as BinaryExpressionOperator);
        lexeme = parser.peek();
    }

    parser.reject();
    return left;
}


// +, -
function parseExpressionAdditive(parser: Parser, ctx: Context): Expression {
    let left = parseExpressionMultiplicative(parser, ctx);
    let lexeme = parser.peek();

    while (lexeme.type === "+" || lexeme.type === "-") {
        parser.accept();
        let right = parseExpressionMultiplicative(parser, ctx);
        left = new BinaryExpression(lexeme.location, left, right, lexeme.type as BinaryExpressionOperator);
        lexeme = parser.peek();
    }
    parser.reject();
    return left;
}


function parseExpressionMultiplicative(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let left = parseExpressionInstance(parser, ctx);
    let lexeme = parser.peek();

    while (lexeme.type === "*" || lexeme.type === "/" || lexeme.type === "%") {
        parser.accept();
        let right = parseExpressionInstance(parser, ctx);
        left = new BinaryExpression(loc, left, right, lexeme.type as BinaryExpressionOperator);
        lexeme = parser.peek();
    }

    parser.reject();
    return left;
}


function parseExpressionInstance(parser: Parser, ctx: Context) {
    let loc = parser.loc();
    let left = parseExpressionUnary(parser, ctx);
    let lexeme = parser.peek();
    if (lexeme.type === "is") {
        parser.accept();
        let right = parseType(parser, ctx);
        return new ((lexeme.type === "is") ? InstanceCheckExpression : CastExpression)(lexeme.location, left, right);
    }
    if (lexeme.type === "as" || lexeme.type === "as!" || lexeme.type === "as?") {
        let loop = true
        while (loop) {
            parser.accept();
            let right = parseType(parser, ctx);
            let cast = new CastExpression(lexeme.location, left, right, (lexeme.type === "as") ? ("regular") : ((lexeme.type === "as!") ? ("force") : ("safe")));
            left = cast;
            lexeme = parser.peek();
            // TODO:
            //  if(((lexeme.type !== "as") && (lexeme.type !== "as!")) && (lexeme.type !== "as?")) {
            if ((lexeme.type !== "as") && (lexeme.type !== "as!")) {
                loop = false;
                parser.reject();
            }
        }
        parser.reject();
        return left;
    }
    parser.reject();
    return left;
}

// ++ (pre), -- (pre), + (unary), - (unary), !, !!, ~
function parseExpressionUnary(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let lexeme = parser.peek();
    if (lexeme.type === "++" || lexeme.type === "--" || lexeme.type === "+" || lexeme.type === "-" || lexeme.type === "!" || lexeme.type === "~") {
        parser.accept();
        let expression = parseExpressionUnary(parser, ctx);
        if (lexeme.type === "++" || lexeme.type === "--") {
            return new UnaryExpression(loc, expression, ("pre" + lexeme.type) as unknown as UnaryOperator);
        }
        return new UnaryExpression(loc, expression, lexeme.type as unknown as UnaryOperator);
    }
    else if (lexeme.type === "await") {
        parser.accept();
        let expression = parseExpressionUnary(parser, ctx);
        return new AwaitExpression(loc, expression);
    }
    else if (lexeme.type === "spawn") {
        parser.accept();
        let expr = parseExpression(parser, ctx);
        if (!expr) {
            throw parser.customError("spawn requires a valid expression", loc);
        }
        return new SpawnExpression(loc, expr);
    }
    else if (lexeme.type === "new") {
        parser.accept();
        let type = parseType(parser, ctx);
        parser.expect("(");
        lexeme = parser.peek();
        parser.reject();
        let args = lexeme.type == ")" ? [] : parseExpressionList(parser, ctx);
        parser.expect(")");
        return new NewExpression(loc, type, args);
    }
    else if (lexeme.type === "coroutine") {
        parser.accept();
        parser.expect("(");
        let baseFn = parseExpression(parser, ctx);
        let tok = parser.peek();
        if (tok.type === ")") {
            parser.accept();
            return new CoroutineConstructionExpression(loc, baseFn, []);
        }
        parser.reject();

        parser.expect(",");
        let args = parseExpressionList(parser, ctx);
        parser.expect(")");
        return new CoroutineConstructionExpression(loc, baseFn, args);
    }
    else {
        parser.reject();
        return parseExpressionPostfix(parser, ctx);
    }
}


// ++ (post), -- (post)
function parseExpressionPostfix(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let expression = parseExpressionPrimary(parser, ctx);
    let lexeme = parser.peek();
    if (lexeme.type === "++" || lexeme.type === "--") {
        parser.accept();
        return new UnaryExpression(loc, expression, ("post" + lexeme.type) as unknown as UnaryOperator);
    }
    parser.reject();
    if (expression == null) {
        return expression;
    }

    return parseExpressionMemberSelection(parser, ctx, expression);
}

// ., ?., (), [] and denull
function parseExpressionMemberSelection(parser: Parser, ctx: Context, lhs: Expression): Expression {
    let loc = parser.loc();
    let lexeme = parser.peek();
    if(parser.isOnANewLine()){
        parser.reject();
        return lhs;
    }
    
    if (lexeme.type === "!") {
        parser.accept();
        let newLHS = new UnaryExpression(loc, lhs, "!!");
        return parseExpressionMemberSelection(parser, ctx, newLHS);
    }
    if (lexeme.type === "." || lexeme.type === "?.") {
        parser.accept();
        let rhs = parseExpressionPrimary(parser, ctx);
        if (!(rhs instanceof ElementExpression)) {
            throw parser.customError("Expected identifier", rhs.location);
        }

        return parseExpressionMemberSelection(parser, ctx,
            new MemberAccessExpression(loc, lhs, rhs, lexeme.type === "?.")
        );
    }
    if (lexeme.type === "(") {
        parser.accept();
        lexeme = parser.peek();
        parser.reject();
        let args = lexeme.type == ")" ? [] : parseExpressionList(parser, ctx);
        parser.expect(")");
        return parseExpressionMemberSelection(parser, ctx, new FunctionCallExpression(loc, lhs, args));
    }
    if (lexeme.type === "[") {
        parser.accept();
        lexeme = parser.peek();
        parser.reject();
        let index = lexeme.type == "]" ? [] : parseExpressionList(parser, ctx); parseExpressionList(parser, ctx);
        parser.expect("]");
        return parseExpressionMemberSelection(parser, ctx, new IndexAccessExpression(loc, lhs, index));
    }

    parser.reject();
    return lhs;
}

// literals, identifiers, parentheses
function parseExpressionPrimary(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    let lexeme = parser.peek();

    // parenthesis
    if (lexeme.type === "(") {
        parser.accept();
        let expressionList = parseExpressionList(parser, ctx);
        parser.expect(")");

        if (expressionList.length == 1) {
            return expressionList[0];
        }
        else {
            return new TupleConstructionExpression(loc, expressionList);
        }
    }

    if (lexeme.type === "[") {
        parser.reject();
        return parseArrayConstruction(parser, ctx);
    }

    if (lexeme.type === "{") {
        parser.reject();
        return parseStructConstruction(parser, ctx);
    }

    if (lexeme.type === "fn") {
        parser.accept();
        let header = parseFnTypeBody(parser, ctx);
        let newScope = new Context(loc, parser, ctx, { withinFunction: true });
        newScope.location = loc;
        let fn = new LambdaExpression(loc, newScope, header, null, null);
        newScope.setOwner(fn);

        lexeme = parser.peek();
        if (lexeme.type === "{") {
            parser.reject();
            let body = parseStatementBlock(parser, newScope);
            fn.body = body;
            return fn
        }
        else {
            parser.reject();
            parser.expect("=");
            let fnBody = parseExpression(parser, newScope);
            fn.expression = fnBody;
            return fn;
        }
    }
    if (lexeme.type === "this") {
        parser.accept();
        return new ThisExpression(loc);
    }

    if (lexeme.isLiteral()) {
        parser.accept();
        return lexeme.toLiteral();
    }

    if (lexeme.type === "identifier") {
        parser.accept();
        let hasG = parserElementHasGenerics(parser, ctx);
        let genericArgs: DataType[] = [];
        if (hasG) {
            parser.expect("<");
            genericArgs = parseTypeList(parser, ctx);
            parser.expect(">");
        }

        return new ElementExpression(loc, lexeme.value, genericArgs);
    }
    else if (lexeme.type === "do") {
        parser.accept()
        let newCtx = new Context(loc, parser, ctx, { withinDoExpression: true });
        let doExpr = new DoExpression(loc, newCtx, null);
        newCtx.setOwner(doExpr);
        let block = parseStatementBlock(parser, newCtx);
        doExpr.block = block;

        return doExpr;
    }

    // @ts-ignore
    return null;
}

function parserElementHasGenerics(parser: Parser, ctx: Context) {
    let areOpposed = (c1: string, c2: string) => {
        if (c1 == "[")
            return c2 == "]";
        if (c1 == "{")
            return c2 == "}";
        if (c1 == "(")
            return c2 == ")";
        if (c1 == "<")
            return c2 == ">";
    }

    let stack: string[] = [];
    let lexeme = parser.peek();

    if (lexeme.type === "<") {
        let canLoop = true;
        while (canLoop) {
            lexeme = parser.peek();
            if (["(", "[", "<", "{"].includes(lexeme.type)) {
                stack.push(lexeme.type);
            }
            if (["}", ">", "]", ")"].includes(lexeme.type)) {
                if ((stack.length == 0) && (lexeme.type == ">")) {
                    parser.reject();
                    return true;
                }

                let last = stack.pop();
                if (!last) {
                    parser.reject();
                    return false;
                }
                if (!areOpposed(last, lexeme.type)) {
                    parser.reject();
                    return false;
                }
            }

            canLoop = (stack.length > 0) || (lexeme.type != "EOF");
        }
    }
    parser.reject();
    return false;
}

function parseArrayConstruction(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    parser.expect("[");
    let lexeme = parser.peek();
    parser.reject();
    let elements = lexeme.type == "]" ? [] : parseExpressionList(parser, ctx, true);
    parser.expect("]");
    return new ArrayConstructionExpression(loc, elements);
}

function parseStructElements(parser: Parser, ctx: Context): (StructKeyValueExpressionPair | StructUnpackedElement)[] {
    /**
     * We expect the following:
     * ...x,
     * x,
     * x: <expr>,
     */
    let elements: (StructKeyValueExpressionPair | StructUnpackedElement)[] = [];
    let loop = true;
    while (loop) {
        let lexeme = parser.peek();
        if (lexeme.type === "...") {
            parser.accept();
            let expression = parseExpression(parser, ctx);
            elements.push(new StructUnpackedElement(parser.loc(), expression));
        }
        else if (lexeme.type === "identifier") {
            parser.reject();
            let name = parser.expect("identifier").value;

            let lexeme2 = parser.peek();
            if (lexeme2.type === ":") {
                parser.accept();
                elements.push(new StructKeyValueExpressionPair(parser.loc(), name, parseExpression(parser, ctx)));
            }
            // no value is present, so it is equivalent to x: x
            else {
                elements.push(new StructKeyValueExpressionPair(parser.loc(), name, new ElementExpression(parser.loc(), name, [])));
            }
        }

        if (parser.is(",")) {
            parser.accept();
        }
        else {
            parser.reject();
            break;
        }
    }
    return elements;
}

function parseStructConstruction(parser: Parser, ctx: Context): Expression {
    let loc = parser.loc();
    parser.expect("{");
    let lexeme = parser.peek();
    if (lexeme.type === "...") {
        parser.reject();
        let elements = parseStructElements(parser, ctx);
        parser.expect("}");
        return new NamedStructConstructionExpression(loc, elements);
    }
    else if (lexeme.type === "identifier") {
        let lexeme2 = parser.peek();
        if (lexeme2.type === ":") {
            parser.reject();
            let elements = parseStructElements(parser, ctx);
            parser.expect("}");
            return new NamedStructConstructionExpression(loc, elements);
        }
        else {
            parser.reject();
        }
    }
    else {
        parser.reject();
    }

    let expressions = parseExpressionList(parser, ctx);
    parser.expect("}");
    return new UnnamedStructConstructionExpression(loc, expressions);
}


function parseVariableDeclaration(parser: Parser, ctx: Context): DeclaredVariable[] {
    let loc = parser.loc();
    let isConst = false;
    let token = parser.peek();
    if (token.type === "const") {
        isConst = true;
        parser.accept();
    }
    else {
        parser.reject();
    }

    /*
        Here are the following ways a variable can be declared:
        1. Regular:
        ```
        let x: u32 = 1, z: u32 = 1
        let y = x
        ```

        2. Array Deconstruction
        ```
        let z: u32[] = [1, 2, 3]
        let [x, _, y] = z // ignoring element at index 1
        ```

        3. Struct Deconstruction
        ```
        let a = {
            x: 1 as u32, y: 2 as u32, z: 3 as u32
        }

        let {x, y, z} = a
        let {ax: x, ay: y, az: z} = a
        ```

        4. Tuple Deconstruction: Tuple deconstruction is only used to unpack values from function returns, where functions return more than one value.
        ```
        fn f(x: u32) -> (u32, u32, u32) = (x+1, x+2, x+3)

        // unpacking 1st and 3rd function return values
        let (a, _, c) = f(1) 
        ```
    */

    if (token.type === "[") {
        let d = parseArrayDeconstruction(parser, ctx, isConst);
        d.forEach(v => {
            v.isFromArray = true
            v.initGroupID = INTIALIZER_GROUP_ID;
        });
        INTIALIZER_GROUP_ID++;
        return d;
    }

    if (token.type === "{") {
        let d = parseObjectDeconstruction(parser, ctx, isConst);
        d.forEach(v => {
            v.isFromStruct = true
            v.initGroupID = INTIALIZER_GROUP_ID;
        });
        INTIALIZER_GROUP_ID++;
        return d;
    }

    if (token.type === "(") {
        let d = parseTupleDeconstruction(parser, ctx, isConst);
        d.forEach(v => {
            v.isFromTuple = true
            v.initGroupID = INTIALIZER_GROUP_ID;
        });
        INTIALIZER_GROUP_ID++;
        return d;
    }

    return parseRegularVariableDeclaration(parser, ctx, isConst);

}
function parseTupleDeconstruction(parser: Parser, ctx: Context, isConst: boolean): DeclaredVariable[] {
    let loc = parser.loc();
    parser.expect("(");
    let elements: (string | null)[] = [];
    let tupleExpression: Expression;

    while (1) {
        if (parser.peek().type == "_") {
            parser.accept();
            elements.push(null);
        } else {
            parser.reject();
            let name = parser.expect("identifier").value;
            elements.push(name);
        }
        if (parser.peek().type != ")") {
            parser.reject();
            parser.expect(",");
        }
        else {
            parser.reject();
            break;
        }
    }
    parser.expect(")");

    parser.expect("=");
    tupleExpression = parseExpression(parser, ctx);

    return elements.filter(e => e !== null).map((name, index) => {
        let tupleDeconstruction = new TupleDeconstructionExpression(
            loc,
            tupleExpression,
            index
        );

        let d = new DeclaredVariable(
            loc,
            name as string,
            tupleDeconstruction,
            null,  // type will be inferred later
            isConst,
            false
        );

        return d
    });
}

function parseObjectDeconstruction(parser: Parser, ctx: Context, isConst: boolean): DeclaredVariable[] {
    parser.expect("{");

    let elements: { variable: DeclaredVariable, isRemaining: boolean, field: string | null }[] = [];
    let readFields: string[] = [];

    while (1) {
        let isRemaining = false;

        if (parser.is("...")) {
            isRemaining = true;
            parser.accept();
            let variableName = parser.expect("identifier").value;

            elements.push({
                variable: new DeclaredVariable(parser.loc(), variableName, new TrueLiteralExpression(parser.loc()), null, isConst, false),
                field: null,
                isRemaining: isRemaining
            });

            break;
        }
        else {
            parser.reject();
            let propertyName = parser.expect("identifier").value;
            let variableName = propertyName;

            readFields.push(propertyName);


            if (parser.is(":")) {
                variableName = parser.expect("identifier").value;
            }
            else {
                parser.reject();
            }

            elements.push({
                variable: new DeclaredVariable(parser.loc(), variableName, new TrueLiteralExpression(parser.loc()), null, isConst, false),
                field: propertyName,
                isRemaining: isRemaining
            });

            if (parser.is(",")) {
                parser.accept();
            }
            else {
                parser.reject();
                break;
            }
        }
    }

    parser.expect("}");
    parser.expect("=");

    let initializer = parseExpression(parser, ctx);

    let vars = elements.map((prop, i) => {
        prop.variable!.initializer = new StructDeconstructionExpression(
            prop.variable!.location,
            initializer,
            prop.isRemaining ? null : prop.field,
            prop.isRemaining ? readFields : null,
            prop.isRemaining
        );

        return prop.variable;
    });

    return vars;
}

function parseArrayDeconstruction(parser: Parser, ctx: Context, isConst: boolean): DeclaredVariable[] {
    parser.expect("[");
    let elements: { variable: DeclaredVariable | null, isRemaining: boolean, isIgnored: boolean }[] = [];

    while (1) {
        let isRemaining = false;

        if (parser.peek().type == "_") {
            parser.accept();
            elements.push({ variable: null, isIgnored: true, isRemaining: false });
        } else {
            parser.reject();
            if (parser.peek().type === "...") {
                isRemaining = true;
                parser.accept();
            }

            parser.reject();
            let name = parser.expect("identifier").value;
            parser.reject();
            elements.push({
                // the initializer is a dummy value, the actual initializer will be set later
                variable: new DeclaredVariable(parser.loc(), name, new TrueLiteralExpression(parser.loc()), null, isConst, false),
                isIgnored: false,
                isRemaining: isRemaining
            });
        }

        if (parser.peek().type == ",") {
            if (isRemaining) {
                throw parser.customError("Unexpected `,` in array deconstruction, after `...`", parser.loc());
            }
            parser.accept();
        }
        else {
            parser.reject();
            break;
        }
    }
    parser.expect("]");
    parser.expect("=");
    let initializer = parseExpression(parser, ctx);

    return elements.filter(e => !e.isIgnored).map((e, index) => {
        if (e.variable) {
            e.variable.initializer = new ArrayDeconstructionExpression(
                e.variable.location,
                initializer,
                index,
                e.isRemaining
            );
            return e.variable;
        }
        throw new Error("Unexpected null variable in array deconstruction");
    });
}


function parseRegularVariableDeclaration(parser: Parser, ctx: Context, isConst: boolean): DeclaredVariable[] {
    var loc = parser.loc();
    var token = parser.expect("identifier");
    parser.accept();
    let name = token.value;
    let type: DataType | null = null;
    // let x: strict i32 = 1
    // let x: strict = someFunc()
    // let x = someFunc2()
    token = parser.peek();
    if (token.type === ":") {
        parser.accept();
        type = parseType(parser, ctx);
    }
    else {
        parser.reject();
    }

    parser.expect("=");
    // TODO: make sure code gen doesn"t generate this expression multipe times for deconstructed variables
    let initializer = parseExpression(parser, ctx);
    let v = new DeclaredVariable(loc, name, initializer, type, isConst, false);
    return [v];
}

function parseVariableDeclarationList(parser: Parser, ctx: Context): DeclaredVariable[] {
    let canLoop = true;
    let declarations: DeclaredVariable[] = [];
    while (canLoop) {
        let decls = parseVariableDeclaration(parser, ctx);

        declarations.push(...decls);

        var token = parser.peek();
        canLoop = token.type === ",";
        if (canLoop) {
            parser.accept();
        }
        else {
            parser.reject();
        }
    }
    return declarations;
}


function parseExpressionList(parser: Parser, ctx: Context, allowDestructuring: boolean = false): Expression[] {
    let canLoop = true;
    let expressions: Expression[] = [];
    while (canLoop) {
        if (allowDestructuring) {
            if (parser.is("...")) {
                parser.accept();
                let expr = parseExpression(parser, ctx);
                expressions.push(new ArrayUnpackingExpression(parser.loc(), expr));

                let token = parser.peek();
                canLoop = token.type === ",";
                if (canLoop) {
                    parser.accept();
                    continue;
                }
                else {
                    parser.reject();
                    break;
                }
            }
            else {
                parser.reject();
            }
        }
        let expr = parseExpression(parser, ctx);
        expressions.push(expr);
        let token = parser.peek();
        canLoop = token.type === ",";
        if (canLoop) {
            parser.accept();
        }
        else {
            parser.reject();
        }
    }
    return expressions;
}

function parseMatchCases(parser: Parser, ctx: Context, form: "expr" | "stmt" = "expr"): MatchCaseExpression[] {
    let cloc = parser.loc();
    let canLoop = true;
    let cases: MatchCaseExpression[] = [];
    while (canLoop) {
        let newScope = new Context(cloc, parser, ctx);
        newScope.location = parser.loc();
        let pattern = parseMatchPattern(parser, newScope);
        let lexeme = parser.peek();
        let loc = parser.loc();
        let ifGuard: Expression | null = null
        if (lexeme.type === "if") {
            parser.accept();
            ifGuard = parseExpression(parser, newScope);
        }
        else {
            parser.reject()
        }

        if (form == "expr") {
            parser.expect("=>");
            let body = parseExpression(parser, newScope);
            cases.push(new MatchCaseExpression(loc, newScope, pattern, "match_expression", body, null, ifGuard));
        }
        else {
            let body = parseStatementBlock(parser, newScope);
            cases.push(new MatchCaseExpression(loc, newScope, pattern, "match_block", null, body, ifGuard));
        }

        if (form == "expr") {
            lexeme = parser.peek();
            if (lexeme.type === ",") {
                parser.accept();
            }
            else {
                parser.reject();
                canLoop = false;
            }
        }
        else {
            lexeme = parser.peek();
            if (lexeme.type === "}") {
                canLoop = false;
            }
            parser.reject();
        }
    }
    return cases;
}

// parses a single pattern expression along side its body
function parseMatchPattern(parser: Parser, ctx: Context, parentType: "array" | "struct" | null = null): PatternExpression {
    let loc = parser.loc();
    let lexeme = parser.peek();
    if (lexeme.type === "[") {
        parser.accept();
        let elements = parseMatchPatternList(parser, ctx);
        parser.expect("]");
        return new ArrayPatternExpression(loc, elements);
    }
    if (lexeme.type === "{") {
        parser.accept();
        let remaining: StructVariablePatternExpression | null = null;
        let fields = parseMatchPatternStructFields(parser, ctx);
        let tok = parser.peek();
        if (tok.type !== "}") {
            parser.reject();
            parser.expect("...");
            let id = parser.expect("identifier");
            remaining = new StructVariablePatternExpression(id.location, id.value);
        }
        else {
            parser.reject();
        }
        parser.expect("}");
        return new StructPatternExpression(loc, fields, remaining);
    }
    else if (lexeme.isLiteral()) {
        parser.accept();
        return new LiteralPatternExpression(loc, lexeme.toLiteral());
    }
    else if (lexeme.type === "_") {
        parser.accept();
        return new WildCardPatternExpression(loc);
    }
    else if (lexeme.type === "identifier") {
        const char = lexeme.value[0];
        if (char == char.toUpperCase()) {
            parser.reject();
            return parseMatchPatternType(parser, ctx);
        }
        else {
            parser.accept();
            return new VariablePatternExpression(loc, lexeme.value);
        }
    }
    else if (lexeme.type === "...") {
        parser.accept();
        let variable = parseMatchPattern(parser, ctx); //, parentType);
        if (!(variable instanceof VariablePatternExpression)) {
            throw parser.customError("Expected variable after token`...` in array pattern", variable.location);
        }

        if (parentType == "array") {
            let arrayVar = new ArrayVariablePatternExpression(variable.location, variable.name);
            return arrayVar;
        }

        return variable;
    }
    else {
        parser.rejectOne();
        let dt = parseType(parser, ctx);
        let dtPattern = new DataTypePatternExpression(loc, dt, []);
        return dtPattern;
    }

    parser.reject();
    parser.assert(false, "Invalid symbol in pattern expression")
    // @ts-ignore
    return null;
}

function parseMatchPatternType(parser: Parser, ctx: Context): PatternExpression {
    let loc = parser.loc();
    let dataType = parseType(parser, ctx);
    let lexeme = parser.peek();
    if (lexeme.type === "(") {
        parser.accept();
        lexeme = parser.peek();
        if (lexeme.type === ")") {
            parser.accept();
            return new DataTypePatternExpression(loc, dataType, []);
        }
        parser.reject();
        let args = parseMatchPatternList(parser, ctx);
        parser.expect(")");
        return new DataTypePatternExpression(loc, dataType, args);
    }
    else {
        parser.reject();
        return new DataTypePatternExpression(loc, dataType, []);
    }
}

function parseMatchPatternList(parser: Parser, ctx: Context): PatternExpression[] {
    let canLoop = true;
    let expressions: PatternExpression[] = [];
    while (canLoop) {
        let expr = parseMatchPattern(parser, ctx, "array");

        expressions.push(expr);
        let token = parser.peek();
        canLoop = token.type === ",";
        if (canLoop) {
            if (expr instanceof ArrayVariablePatternExpression) {
                throw parser.customError("Expected end of array pattern after array variable pattern `...`", token.location);
            }
            parser.accept();
        }
        else {
            parser.reject();
        }
    }
    return expressions;
}

function parseMatchPatternStructFields(parser: Parser, ctx: Context): StructFieldPattern[] {
    let canLoop = true;
    let fields: StructFieldPattern[] = [];
    while (canLoop) {
        let tok = parser.peek();
        if (tok.type === "identifier") {
            parser.accept();
            parser.expect(":");
            let pattern = parseMatchPattern(parser, ctx, "struct");
            fields.push({ name: tok.value, pattern: pattern });
            let token = parser.peek();
            canLoop = token.type === ",";
            if (canLoop) {
                parser.accept();
            }
            else {
                parser.reject();
            }
        }
        else {
            parser.reject();
            canLoop = false;
        }

    }
    return fields;
}

/**
 * Statements
 */

function parseStatement(parser: Parser, ctx: Context): Statement {
    let lexeme = parser.peek();
    parser.reject();

    switch (lexeme.type) {
        case "let":
            return parseStatementLet(parser, ctx);
        case "return":
            return parseStatementReturn(parser, ctx);
        case "break":
            return parseStatementBreak(parser, ctx);
        case "continue":
            return parseStatementContinue(parser, ctx);
        case "return":
            return parseStatementReturn(parser, ctx);
        case "if":
            return parseStatementIf(parser, ctx);
        case "while":
            return parseStatementWhile(parser, ctx);
        case "do":
            return parseStatementRepeat(parser, ctx);
        case "for":
            return parseStatementFor(parser, ctx);
        case "foreach":
            return parseStatementForEach(parser, ctx);
        case "match":
            return parseStatementMatch(parser, ctx);
        case "fn":
            return parseStatementFn(parser, ctx);
        case "{":
            return parseStatementBlock(parser, ctx);
        default:
            return parseStatementExpression(parser, ctx);
    }
}

function parseStatementLet(parser: Parser, ctx: Context): VariableDeclarationStatement {
    let loc = parser.loc();
    parser.expect("let");
    let variables = parseVariableDeclarationList(parser, ctx);


    return new VariableDeclarationStatement(loc, variables);
}

function parseStatementReturn(parser: Parser, ctx: Context): Statement {
    let loc = parser.loc();
    parser.expect("return");
    parser.assert(ctx.env.withinFunction || ctx.env.withinDoExpression, "Cannot return outside of function");
    let expression = parseExpression(parser, ctx); //parseExpression(parser, ctx);

    if (ctx.env.withinDoExpression) {
        parser.assert(expression != null, "Cannot return void from a do-expression, must always return an expression");
    }

    let ret = new ReturnStatement(loc, expression)
    if (ctx.env.withinDoExpression) {
        ctx.findParentDoExpression()!.returnStatements.push({ stmt: ret, ctx });
    }
    else {
        ctx.findParentFunction()?.returnStatements.push({ stmt: ret, ctx });
    }

    return ret;
}

function parseStatementBreak(parser: Parser, ctx: Context): BreakStatement {
    let loc = parser.loc();
    parser.expect("break");
    parser.assert(ctx.env.withinLoop, "Cannot break outside of loop");

    return new BreakStatement(loc);
}

function parseStatementContinue(parser: Parser, ctx: Context): ContinueStatement {
    let loc = parser.loc();
    parser.expect("continue");
    parser.assert(ctx.env.withinLoop, "Cannot continue outside of a loop");

    return new ContinueStatement(loc);
}

function parseStatementIf(parser: Parser, ctx: Context): IfStatement {
    let loc = parser.loc();
    parser.expect("if");
    let ifBlocks: { expression: Expression, statement: BlockStatement }[] = []
    let elseExpr: BlockStatement | null = null;

    let loop = true;
    while (loop) {
        let expr = parseExpression(parser, ctx);
        let stmt = parseStatementBlock(parser, ctx);
        ifBlocks.push({ expression: expr, statement: stmt });
        let lexeme = parser.peek();

        if (lexeme.type === "else") {
            parser.accept();
            lexeme = parser.peek();
            if (lexeme.type === "if") {
                parser.accept();
            }
            else {
                parser.reject();
                loop = false;
                elseExpr = parseStatementBlock(parser, ctx);
            }
        }
        else {
            parser.reject();
            loop = false;
        }
    }
    return new IfStatement(loc, ifBlocks, elseExpr);
}

function parseStatementWhile(parser: Parser, ctx: Context): WhileStatement {
    let loc = parser.loc();
    parser.expect("while");
    let expression = parseExpression(parser, ctx);
    let statement = parseStatementBlock(parser, ctx, true);
    // mark the statement block as a loop context
    statement.context.env.loopContext = true;
    return new WhileStatement(loc, expression, statement);
}

function parseStatementRepeat(parser: Parser, ctx: Context): DoWhileStatement {
    let loc = parser.loc();
    parser.expect("repeat");
    let statement = parseStatementBlock(parser, ctx, true);
    // mark the statement block as a loop context
    statement.context.env.loopContext = true;
    parser.expect("while");
    let expression = parseExpression(parser, ctx);

    return new DoWhileStatement(loc, expression, statement);
}

function parseStatementFor(parser: Parser, ctx: Context): ForStatement {
    let loc = parser.loc();
    parser.expect("for");

    let token = parser.peek();
    let initializers: Statement[] = [];
    let newScope = new Context(loc, parser, ctx);
    newScope.location = loc;

    if (token.type === ";") {
        parser.accept();
    }
    else {
        parser.reject();
        initializers = parseStatementList(parser, newScope);
        parser.expect(";");
    }

    token = parser.peek();
    let condition: Expression | null = null;
    if (token.type === ";") {
        parser.accept();
    }
    else {
        parser.reject();
        condition = parseExpression(parser, newScope);
        parser.expect(";");
    }

    let incrementors: Expression[] = [];

    token = parser.peek();
    if (token.type !== "{") {
        parser.reject();
        incrementors = parseExpressionList(parser, newScope);
    }
    else {
        parser.reject();
    }

    let body = parseStatementBlock(parser, newScope);
    // mark the statement block as a loop context
    return new ForStatement(loc, newScope, initializers, condition, incrementors, body);
}

function parseStatementForEach(parser: Parser, ctx: Context): ForeachStatement {
    let loc = parser.loc();
    parser.expect("foreach");
    let token = parser.expect("identifier");
    let name = token.value;
    parser.expect("in");
    let expression = parseExpression(parser, ctx);
    let body = parseStatementBlock(parser, ctx);
    // mark the statement block as a loop context
    body.context.env.loopContext = true;
    //return new ForeachStatement(loc, ctx, name, expression, body);
    throw parser.error("Not implemented", loc, 1);
}

function parseStatementMatch(parser: Parser, ctx: Context): MatchStatement {
    let loc = parser.loc();
    parser.expect("match");
    parser.accept();
    let expression = parseExpression(parser, ctx);
    parser.expect("{");
    let cases: MatchCaseExpression[] = parseMatchCases(parser, ctx, "stmt");
    // make sure we have at least one case
    if (cases.length == 0) {
        throw parser.customError("Match expression must have at least one case", loc);
    }
    parser.expect("}");
    return new MatchStatement(loc, expression, cases);
}

/**
 * 
 * @param parser 
 * @param ctx 
 * @param isLoop flag, set to true if this function is called from a loop without ctx
 * @returns 
 */
function parseStatementBlock(parser: Parser, ctx: Context, isLoop: boolean = false): BlockStatement {
    let loc = parser.loc();
    parser.expect("{");
    let newScope = new Context(loc, parser, ctx, { withinLoop: isLoop });
    newScope.location = loc;
    let statements: Statement[] = [];
    let tok = parser.peek();
    parser.reject();
    let canLoop = tok.type !== "}";
    while (canLoop) {
        let statement = parseStatement(parser, newScope);
        statements.push(statement);
        let token = parser.peek();
        canLoop = token.type !== "}";
        parser.reject();
    }

    parser.expect("}");
    return new BlockStatement(loc, newScope, statements);
}

function parseStatementExpression(parser: Parser, ctx: Context): ExpressionStatement {
    let loc = parser.loc();
    let lexeme = parser.peek();
    parser.reject();
    let expression = parseExpression(parser, ctx);
    if (expression == null) {
        throw parser.error("Invalid expression", loc, lexeme.value.length);
    }
    return new ExpressionStatement(loc, expression);
}

function parseStatementFn(parser: Parser, ctx: Context): FunctionDeclarationStatement {
    let loc = parser.loc();
    let proto = parseFunctionPrototype(parser, ctx);

    let lexeme = parser.peek();

    let newScope = new Context(loc, parser, ctx, { withinFunction: true });
    newScope.location = loc;

    let fn = new DeclaredFunction(loc, newScope, proto, null, null);
    newScope.setOwner(fn);

    let exprBody: Expression | null = null;
    let stmtBody: BlockStatement | null = null;

    if (lexeme.type === "{") {
        parser.reject();
        stmtBody = parseStatementBlock(parser, newScope);
    }
    else {
        parser.reject();
        parser.expect("=");
        exprBody = parseExpression(parser, newScope);
    }

    fn.body = stmtBody;
    fn.expression = exprBody;

    parser.assert((exprBody !== null) || (stmtBody !== null), "Function body is not defined!");

    let fnStatement = new FunctionDeclarationStatement(loc, fn);
    fn.declStatement = fnStatement;
    ctx.addSymbol(fn);

    //ctx.overrideSymbol(proto.name, fn.astNode);
    return fnStatement;
}

function parseStatementList(parser: Parser, ctx: Context): Statement[] {
    let canLoop = true;
    let statements: Statement[] = [];
    while (canLoop) {
        let stmt = parseStatement(parser, ctx);
        statements.push(stmt);
        let token = parser.peek();
        canLoop = token.type === ",";
        if (canLoop) {
            parser.accept();
        }
        else {
            parser.reject();
        }
    }
    return statements;
}


export { parseImport, parseFrom, parseTypeDecl, parseExpression, parseStatement, parseFFI }