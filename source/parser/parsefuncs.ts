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
import {
    ArrayConstructionExpression,
    ArrayUnpackingExpression,
} from "../ast/expressions/ArrayConstructionExpression";
import {
    BinaryExpression,
    BinaryExpressionOperator,
} from "../ast/expressions/BinaryExpression";
import { ElementExpression } from "../ast/expressions/ElementExpression";
import { Expression } from "../ast/expressions/Expression";
import { FunctionCallExpression } from "../ast/expressions/FunctionCallExpression";
import { IfElseExpression } from "../ast/expressions/IfElseExpression";
import { IndexAccessExpression } from "../ast/expressions/IndexAccessExpression";
import { IndexSetExpression } from "../ast/expressions/IndexSetExpression";
import { InstanceCheckExpression } from "../ast/expressions/InstanceCheckExpression";
import { LambdaExpression } from "../ast/expressions/LambdaExpression";
import { LetInExpression } from "../ast/expressions/LetInExpression";
import {
    MatchCaseExpression,
    MatchExpression,
} from "../ast/expressions/MatchExpression";
import { MemberAccessExpression } from "../ast/expressions/MemberAccessExpression";
import {
    NamedStructConstructionExpression,
    StructUnpackedElement,
    StructKeyValueExpressionPair,
} from "../ast/expressions/NamedStructConstructionExpression";
import { NewExpression } from "../ast/expressions/NewExpression";
import { ThisExpression } from "../ast/expressions/ThisExpression";
import {
    UnaryExpression,
    UnaryOperator,
} from "../ast/expressions/UnaryExpression";
import { ArrayPatternExpression } from "../ast/matching/ArrayPatternExpression";
import { ArrayVariablePatternExpression } from "../ast/matching/ArrayVariablePatternExpression";
import { DataTypePatternExpression } from "../ast/matching/DataTypePatternExpression";
import { LiteralPatternExpression } from "../ast/matching/LiteralPatternExpression";
import {
    StructPatternExpression,
    StructFieldPattern,
} from "../ast/matching/StructPatternExpression";
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
import { ClassImplementation, ClassType } from "../ast/types/ClassType";
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
import {
    VariantConstructorType,
    VariantParameter,
} from "../ast/types/VariantConstructorType";
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
import { TupleType } from "../ast/types/TupleType";
import { TupleConstructionExpression } from "../ast/expressions/TupleConstructionExpression";
import { TrueLiteralExpression } from "../ast/expressions/LiteralExpression";
import { TupleDeconstructionExpression } from "../ast/expressions/TupleDeconstructionExpression";
import { CoroutineType } from "../ast/types/CoroutineType";
import { CoroutineConstructionExpression } from "../ast/expressions/CoroutineConstructionExpression";
import { DoExpression } from "../ast/expressions/DoExpression";
import { ArrayDeconstructionExpression } from "../ast/expressions/ArrayDeconstructionExpression";
import { StructDeconstructionExpression } from "../ast/expressions/StructDeconstructionExpression";
import { YieldExpression } from "../ast/expressions/YieldExpression";
import { MutateExpression } from "../ast/expressions/MutateExpression";
import { UnreachableExpression } from "../ast/expressions/UnreachableExpression";
import { DeclaredNamespace } from "../ast/symbol/DeclaredNamespace";
import { BasePackage } from "../ast/BasePackage";
import { ImplementationAttribute } from "../ast/other/ImplementationAttribute";
import { ImplementationMethod } from "../ast/other/ImplementationMethod";
import { ImplementationType } from "../ast/types/ImplementationType";
import { ThisDistributedAssignExpression } from "../ast/expressions/ThisDistributedAssignExpression";
import { ReverseIndexAccessExpression } from "../ast/expressions/ReverseIndexAccessExpression";
import { ReverseIndexSetExpression } from "../ast/expressions/ReverseIndexSetExpression";
import { getOperatorOverloadName } from "../typechecking/OperatorOverload";

let INTIALIZER_GROUP_ID = 1;

type ExpressionParseOptions = {
    allowNullable: boolean;
};

export type MethodOperatorName = "+" 
                        | "-" 
                        | "*" 
                        | "/" 
                        | "%"  
                        | "<" 
                        | ">" 
                        | "<=" 
                        | ">="
                        | ">>"
                        | "<<"
                        | "!"
                        | "~"
                        | "&"
                        | "|"
                        | "^"
                        | "&&"
                        | "||"
                        | "[]"
                        | "[-]"
                        | "[]="
                        | "[-]="
                        | "()"
                        | "+"
                        | "-"
                        | "*"
                        | "/"
                        | "%"
                        | ">"
                        | "<"
                        | ">="
                        | "<="
                        | "<<"
                        | ">>"
                        | "&"
                        | "|"
                        | "^"
                        | "&&"
                        | "||"
                        | "-"
                        | "!"
                        | "~"
                        | "++"
                        | "--";


const methodOperators = ["+", "-", "*", "/", "%", "<", ">", "<=", ">=", ">>", "<<", "&", "|", "^", "&&", "||", "!", "~", "&", "|", "^", "&&", "||", "-", "!"];
/**
 * A decorator that tracks the state of the parser
 * Pushes the current function on call and pops it on return
 */
function trackState(): MethodDecorator {
    return function (
        _: any,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor,
    ): void {
        const originalFunction = descriptor.value as (...args: any[]) => any;

        descriptor.value = function (...args: any[]): any {
            ParseMethods.pushState(String(propertyKey)); // Use the function's name as the state
            let res: any = originalFunction.apply(this, args);
            ParseMethods.popState();
            return res;
        };
    };
}

export type ParseState = {
    name: string;
    metadata: {[key: string]: any};
}

export class ParseMethods {
    static state: ParseState[] = [];

    static pushState(state: string) {
        this.state.push({name: state, metadata: {}});
    }

    static popState() {
        this.state.pop();
    }

    static setState(props: {[key: string]: any}) {
        this.state[this.state.length - 1].metadata = {...this.state[this.state.length - 1].metadata, ...props};
    }

    static reset() {
        this.state = [];
    }

    @trackState()
    static parseMethodOperatorName(parser: Parser): MethodOperatorName {
        let tok = parser.peek();
        if (methodOperators.includes(tok.value)) {
            parser.accept();
            return tok.value as MethodOperatorName;
        }
        
        // unusual cases such as "[]", "[-]", "[]=", "[-]=", "()"
        switch(tok.value) {
            case "[":
                parser.accept();
                tok = parser.peek();
                if (tok.value === "]") {
                    parser.accept();
                    tok = parser.peek();
                    if (tok.value === "=") {
                        parser.accept();
                        return "[]=";
                    }
                    parser.reject();
                    return "[]";
                }
                else if (tok.value === "-") {
                    parser.accept();
                    tok = parser.peek();
                    if (tok.value === "]") {
                        parser.accept();
                        
                        tok = parser.peek();
                        if(tok.value === "="){
                            parser.accept();
                            return "[-]=";
                        }
                        parser.reject();
                        return "[-]";
                    }
                    parser.customError("Invalid method operator name", parser.loc());
                }
                break;
            case "(":
                parser.accept();
                if (parser.peek().value === ")") {
                    parser.accept();
                    return "()";
                }
                else {
                    parser.customError("Invalid method operator name, expected '()'", parser.loc());
                }
                break;
            default:
                parser.customError("Invalid method operator name", parser.loc());
        }

        parser.customError("Invalid method operator name", tok.location);
    }

    // <genericArgDecl> ::= "<" id (":" <type>)? ("," id (":" <type>)?)+ ">"
    @trackState()
    static parseGenericArgDecl(parser: Parser, ctx: Context): GenericType[] {
        let generics: GenericType[] = [];

        parser.expect("<");
        let loop = true;

        while (loop) {
            let loc = parser.loc();
            ParseMethods.setState({"expectedTokens": ["$identifier"]});
            let token = parser.expect("identifier");
            let next = parser.peek();
            if (next.type === ":") {
                parser.accept();
                ParseMethods.setState({"expectedTokens": ["$type"]});
                let type = ParseMethods.parseTypeUnion(parser, ctx);
                generics.push(
                    new GenericType(
                        loc,
                        token.value,
                        new GenericTypeConstraint(type),
                    ),
                );
            } else {
                parser.reject();
                // make sure generic doesn"t already exist
                if (generics.find((g) => g.name == token.value)) {
                    //throw new Error(`Generic "${token.value}" already exists`);
                    parser.error(`Generic "${token.value}" already exists in list`);
                }
                generics.push(
                    new GenericType(
                        loc,
                        token.value,
                        new GenericTypeConstraint(null),
                    ),
                );
            }

            let current = parser.peek();
            if (current.type === ",") {
                parser.accept();
            } else {
                parser.reject();
                loop = false;
            }
        }

        parser.expect(">");
        return generics;
    }

    @trackState()
    static parseTypeList(parser: Parser, ctx: Context): DataType[] {
        const types: DataType[] = [];
        let loop = true;
        while (loop) {
            const type = ParseMethods.parseType(parser, ctx);
            types.push(type);
            const token = parser.peek();
            if (token.type === ",") {
                parser.accept();
            } else {
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
    @trackState()
    static parseStructFields(
        parser: Parser,
        ctx: Context,
        allowDuplicatedNames = false,
    ): StructField[] {
        let canLoop = true;
        let fields: StructField[] = [];
        while (canLoop) {
            let loc = parser.loc();
            ParseMethods.setState({"expectedTokens": ["$identifier"]});
            let id = parser.expect("identifier");
            ParseMethods.setState({"expectedTokens": [":"]});
            parser.expect(":");
            ParseMethods.setState({"expectedTokens": ["$type"]});
            let type = ParseMethods.parseType(parser, ctx);
            // make sure no fields are duplicated
            if (!allowDuplicatedNames) {
                if (fields.find((f) => f.name == id.value)) {
                    parser.error(
                        `Duplicate field "${id.value}" in struct`,
                        id.location,
                    );
                }
            }

            fields.push(new StructField(loc, id.value, type));
            let token = parser.peek();
            canLoop = token.type === ",";

            if (canLoop) {
                parser.accept();

                let token2 = parser.peek();
                if (token2.type === "}") {
                    canLoop = false;
                }
                // reject in all cases, parent will .expect("}")
                parser.reject();
            } else {
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
    @trackState()
    static parseVariantParams(
        parser: Parser,
        ctx: Context,
        allowDuplicatedNames = false,
    ): StructField[] {
        let canLoop = true;
        let fields: VariantParameter[] = [];
        while (canLoop) {
            let loc = parser.loc();
            ParseMethods.setState({"expectedTokens": ["$identifier"]});
            let id = parser.expect("identifier");
            ParseMethods.setState({"expectedTokens": [":"]});
            parser.expect(":");
            ParseMethods.setState({"expectedTokens": ["$type"]});
            let type = ParseMethods.parseType(parser, ctx);
            // make sure no fields are duplicated
            if (!allowDuplicatedNames) {
                if (fields.find((f) => f.name == id.value)) {
                    parser.error(
                        `Duplicate field "${id.value}" in struct`,
                        id.location,
                    );
                }
            }

            fields.push(new VariantParameter(loc, id.value, type));
            let token = parser.peek();
            canLoop = token.type === ",";

            if (canLoop) {
                parser.accept();
            } else {
                parser.reject();
            }
        }

        return fields;
    }

    @trackState()
    static parseVariantConstructor(
        parser: Parser,
        ctx: Context,
    ): VariantConstructorType[] {
        let constructors: VariantConstructorType[] = [];
        let canLoop = true;

        while (canLoop) {
            let loc = parser.loc();
            ParseMethods.setState({"expectedTokens": ["$identifier"]});
            const constructorTok = parser.expect("identifier");
            const constructorName = constructorTok.value;
            ParseMethods.setState({"expectedTokens": ["("]});
            parser.expect("(");
            let fields: VariantParameter[] = [];
            let lexeme = parser.peek();
            parser.reject();
            if (lexeme.type === ")") {
                parser.reject();
            } else {
                fields = ParseMethods.parseVariantParams(parser, ctx, true);
            }

            parser.expect(")");
            // make sure constructor name doesnt exist already
            if (constructors.find((c) => c.name == constructorName)) {
                parser.error(
                    `Duplicate constructor "${constructorName}" in variant`,
                    constructorTok.location,
                );
            }
            constructors.push(
                new VariantConstructorType(loc, constructorName, fields),
            );
            const token = parser.peek();
            canLoop = token.type === ",";
            if (canLoop) {
                parser.accept();
                let tok = parser.peek();
                if (tok.type === "}") {
                    canLoop = false;
                }

                // reject in all cases
                parser.reject();
            } else {
                parser.reject();
            }
        }

        return constructors;
    }

    @trackState()
    static parseFunctionPrototype(
        parser: Parser,
        ctx: Context,
    ): FunctionPrototype {
        let loc = parser.loc();
        ParseMethods.setState({"expectedTokens": ["fn", "cfn"]});
        let tok = parser.expect(["fn", "cfn"]);
        ParseMethods.setState({"expectedTokens": ["$identifier"]});
        let name = parser.expect("identifier").value;
        let generics: GenericType[] = [];

        let lexeme = parser.peek();
        parser.reject();
        if (lexeme.type === "<") {
            ParseMethods.setState({"expectedTokens": ["$genericArgDecl"]});
            generics = ParseMethods.parseGenericArgDecl(parser, ctx);
        }

        let header = ParseMethods.parseFnTypeBody(parser, ctx);
        header.isCoroutine = tok.type === "cfn";
        return new FunctionPrototype(loc, name, header, generics);
    }

    @trackState()
    static parseMethodFunctionPrototype(
        parser: Parser,
        ctx: Context,
    ): {fnProto: FunctionPrototype, altNames: string[]} {
        let loc = parser.loc();
        ParseMethods.setState({"expectedTokens": ["fn"]});
        let tok = parser.expect("fn");
        tok = parser.peek();
        let name: string | null = null;
        let altNames: string[] = [];

            parser.reject();

        let canLoop = true;
        while(canLoop){
            ParseMethods.setState({"expectedTokens": ["$identifier", "$methodOperatorName"]});
            let tok = parser.peek();
            if(tok.type === "identifier"){
                parser.accept();
                if(name === null){
                    name = tok.value;
                }
                else{
                    altNames.push(tok.value);
                }
            }
            else {
                parser.reject();
                let op = ParseMethods.parseMethodOperatorName(parser);
                let opName = getOperatorOverloadName(ctx, op);
                if(name !== null){
                    altNames.push(opName);
                }
                else{
                    name = opName
                }
            }

            tok = parser.peek();
            if(tok.type === "|"){
                parser.accept();
            }
            else{
                canLoop = false;
            }
            parser.reject();
        }

        let generics: GenericType[] = [];

        let lexeme = parser.peek();
        parser.reject();
        if (lexeme.type === "<") {
            ParseMethods.setState({"expectedTokens": ["$genericArgDecl"]});
            generics = ParseMethods.parseGenericArgDecl(parser, ctx);
        }

        let header = ParseMethods.parseFnTypeBody(parser, ctx);
        header.isCoroutine = tok.type === "cfn";

        if(name === null){
            throw new Error("Unreachable code");
        }
        return {fnProto: new FunctionPrototype(loc, name!, header, generics), altNames};
    }

    @trackState()
    static parseMethodInterface(parser: Parser, ctx: Context): InterfaceMethod[] {
        let loc = parser.loc();

        //let fnProto = parseFunctionPrototype(parser, ctx);
        let {imethod, altNames} = ParseMethods.parseClassMethodInterface(parser, ctx);

        let methods: InterfaceMethod[] = [imethod];

        let emptyMap: { [key: string]: DataType } = {};
        for(let altName of altNames) {
            let newM = imethod.clone(emptyMap);
            newM.name = altName;
            methods.push(newM);
        }

        return methods;
    }

    @trackState()
    static parseRegularMethodInterface(parser: Parser, ctx: Context): InterfaceMethod {
        let loc = parser.loc();
        let isStatic = false;
        let token = parser.peek();
        ParseMethods.setState({"expectedTokens": ["fn", "static"]});
        if (token.type === "static") {
            parser.accept();
            isStatic = true;
        } else {
            parser.reject();
        }

        let fnProto = ParseMethods.parseFunctionPrototype(parser, ctx);

        return new InterfaceMethod(
            loc,
            fnProto.name,
            fnProto.header,
            isStatic,
            fnProto.generics,
        );
    }

    @trackState()
    static parseClassMethodInterface(parser: Parser, ctx: Context): {
        imethod: InterfaceMethod,
        altNames: string[]
    } {
        let loc = parser.loc();

        let {fnProto, altNames} = ParseMethods.parseMethodFunctionPrototype(parser, ctx);

        let imethod = new InterfaceMethod(
            loc,
            fnProto.name,
            fnProto.header,
            false,
            fnProto.generics,
        );

        return {imethod, altNames};
    }

    // parses fn body starting from parenthesis "(" <args> ")" ("->" <type>)?
    @trackState()
    static parseFnTypeBody(parser: Parser, ctx: Context): FunctionType {
        let fnLoc = parser.loc();
        ParseMethods.setState({"expectedTokens": ["("]});
        parser.expect("(");
        let lexeme = parser.peek();
        ParseMethods.setState({"expectedTokens": ["$identifier", "mut"]});
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
            } else {
                parser.reject();
            }
            let loc = parser.loc();
            ParseMethods.setState({"expectedTokens": ["$identifier"]});
            let id = parser.expect("identifier");
            ParseMethods.setState({"expectedTokens": [":"]});
            parser.expect(":");
            ParseMethods.setState({"expectedTokens": ["$type"]});
            let type = ParseMethods.parseType(parser, ctx);
            // make sure  parameter doesnt exist already
            if (parameters.find((p) => p.name == id.value)) {
                parser.error(
                    `Duplicate parameter "${id.value}" in function`,
                    id.location,
                );
            }
            parameters.push(new FunctionArgument(loc, id.value, type, isMut));

            token = parser.peek();
            canLoop = token.type === ",";
            if (canLoop) {
                parser.accept();
            } else {
                parser.reject();
            }
        }
        ParseMethods.setState({"expectedTokens": [")"]});
        parser.expect(")");

        lexeme = parser.peek();
        if (lexeme.type === "->") {
            ParseMethods.setState({"expectedTokens": ["$type"]});
            parser.accept();
            returnType = ParseMethods.parseType(parser, ctx);
        } else {
            parser.reject();
        }

        // make sure we have at maximum 255 parameters
        if (parameters.length > 255) {
            parser.error(
                `Function cannot have more than 255 parameters, ${parameters.length} found`,
                { file: fnLoc.file, line: fnLoc.line, col: fnLoc.col, pos: fnLoc.pos },
            );
        }
        return new FunctionType(fnLoc, parameters, returnType);
    }

    // parses <id>(.<id>)*
    @trackState()
    static parsePackageReference(parser: Parser, ctx: Context): string[] {
        ParseMethods.setState({"expectedTokens": ["$identifier"]});
        let id = parser.expect("identifier");
        let basePath = [id.value];

        let token = parser.peek();
        while (token.type === ".") {
            parser.accept();
            ParseMethods.setState({"expectedTokens": ["$identifier"]});
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
    @trackState()
    static parseImport(parser: Parser) {
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
        } else {
            parser.reject();
        }

        parser.basePackage.addImport(
            new ImportNode(loc, basePath, actualName, alias, []),
        );
    }

    /**
     * "<from_import> ::= "from" <id> ("." <id>)* import <id> ("as" <id>)?
     */
    @trackState()
    static parseFrom(parser: Parser) {
        let loc = parser.loc();
        parser.expect("from");
        // now we expect an identifier
        ParseMethods.setState({"expectedTokens": ["$identifier"]});
        let id = parser.expectPackageName();

        const basePath = [id.value];

        let token = parser.peek();
        while (token.type === ".") {
            ParseMethods.setState({"expectedTokens": ["$identifier"]});
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
            let asterisk = parser.peek();
            if(asterisk.type === "*"){
                parser.accept();

                parser.basePackage.addImport(
                    new ImportNode(loc, basePath, "*", "*", []),
                );
                canReadPackage = false;
                break;
            }
            else{
                parser.reject();
            }
            ParseMethods.setState({"expectedTokens": ["$identifier"]});
            const id = parser.expectPackageName();
            const postPath = [id.value];
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
                ParseMethods.setState({"expectedTokens": ["$identifier"]});
                parser.accept();
                alias = parser.expectPackageName().value;
            } else {
                parser.reject();
            }

            parser.basePackage.addImport(
                new ImportNode(loc, basePath, alias, actualName, postPath),
            );

            const tok2 = parser.peek();
            if (tok2.type === ",") {
                parser.accept();
            } else {
                parser.reject();
                canReadPackage = false;
            }
        }

        token = parser.peek();
        if (token.type === ";") {
            parser.accept();
        } else {
            parser.reject();
        }
    }

    /**
     * FFI
     */
    @trackState()
    static parseFFI(parser: Parser, ctx: Context) {
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
            let method = ParseMethods.parseRegularMethodInterface(parser, ctx);
            // make sure no duplicate methods
            if (methods.find((m) => method.name == m.imethod.name)) {
                parser.customError(
                    `Duplicate method "${method.name}" in FFI`,
                    method.location,
                );
            }
            methods.push(new FFIMethodType(method.location, method));
            tok = parser.peek();
            canLoop = tok.type != "}";
            parser.reject();
        }
        parser.expect("}");

        let ffi = new DeclaredFFI(nameTok.location, nameTok.value, string, methods);
        return ffi;
    }


    @trackState()
    static parseNamespace(parser: Parser, ctx: Context) {
        let loc = parser.loc();
        parser.expect("namespace");
        let name = parser.expect("identifier").value;
        let ns = new DeclaredNamespace(loc, ctx, name);
        parser.expect("{");
        let token = parser.peek();
        let canLoop = token.type != "}";
        parser.reject()
        let isLocal = false;

        while (canLoop) {
            ParseMethods.setState({"expectedTokens": ["local", "let", "type", "namespace", "fn", "cfn"]});
            if (token.type === "local") {
                isLocal = true;
                parser.expect("local");
                token = parser.peek();// does .peek and .accept 
                parser.reject();

                if (token.type == "let"){
                    // the syntax here is let local so we throw an error
                    ctx.parser.customError("Invalid syntax, local is used prior to a declaration of a function/type or within let", token.location)
                }
            }

            switch(token.type) {
                case "let": {
                    parser.expect("let");
                    let stmt = ParseMethods.parseVariableDeclarationList(parser, ns.ctx);
                    ns.addStatement(new VariableDeclarationStatement(stmt[0].location, stmt));
                    break;
                }
                case "type": {
                    let dt = ParseMethods.parseTypeDecl(parser, ns.ctx);
                    ns.addSymbol(dt)
                    dt.setLocal(isLocal);
                    isLocal = false;
                    break;
                }
                case "namespace": {
                    let ns2 = ParseMethods.parseNamespace(parser, ns.ctx);
                    ns.addSymbol(ns2);
                    ns2.setLocal(isLocal);
                    isLocal = false;
                    break;
                }
                case "fn":
                case "cfn": {
                    let fn = ParseMethods.parseStatementFn(parser, ns.ctx);
                    // the symbol is added within parseStatementFn
                    ns.addStatement(fn);
                    fn.symbolPointer.setLocal(isLocal);
                    isLocal = false;
                    break;
                }
                default: {
                    parser.customError(`Unexpected token ${token.type}`, token.location)
                }
            }

            token = parser.peek();
            canLoop = token.type != "}";
            parser.reject();
        }
        parser.expect("}");

        return ns;
    }

    /**
     * Data Types
     */
    // <type_decl> ::= "type" <identifier> <generic_arg_decl> "=" <type>
    @trackState()
    static parseTypeDecl(parser: Parser, ctx: Context) {
        let loc = parser.loc();
        parser.expect("type");

        const name = parser.expect("identifier").value;
        let generics: GenericType[] = [];

        let token = parser.peek();
        if (token.type === "<") {
            parser.reject();
            generics = ParseMethods.parseGenericArgDecl(parser, ctx);
        } else {
            parser.reject();
        }

        token = parser.expect("=");
        const type = ParseMethods.parseType(parser, ctx);

        /**
         * if the type is not generic, we resolve it right away, otherwise,
         * we resolve it once it is used (i.e concrete types has been provided)
         */

        let declaredType = new DeclaredType(
            loc,
            ctx,
            name,
            type,
            generics,
            ctx.getCurrentPackage(),
        );

        /*
        Postpone type resolution for when used or import or later, because some symbols might not be resolved yet
        if(!declaredType.isGeneric()) {
            declaredType.type.resolve(parser.basePackage.ctx);
        }
        */

        return declaredType;
    }

    @trackState()
    static parseType(parser: Parser, ctx: Context): DataType {
        let loc = parser.loc();
        let typeDefinition = ParseMethods.parseTypeIntersection(parser, ctx);

        let lexeme = parser.peek();
        if (lexeme.type === "?") {
            parser.accept();
            typeDefinition = new NullableType(loc, typeDefinition);
        } else {
            parser.reject();
        }
        return typeDefinition;
    }

    @trackState()
    static parseTypeUnion(parser: Parser, ctx: Context): DataType {
        //throw new Error("Unions are not implemented in this version of type-c");

        let loc = parser.loc();
        let left = ParseMethods.parseTypeIntersection(parser, ctx);
        let lexeme = parser.peek();
        if (lexeme.type === "|") {
            parser.accept();
            let right = ParseMethods.parseTypeUnion(parser, ctx);
            let type = new UnionType(loc, left, right);
            return type;
        }
        parser.reject();
        return left;
    }

    @trackState()
    static parseTypeIntersection(parser: Parser, ctx: Context): DataType {
        let loc = parser.loc();
        let left = ParseMethods.parseTypeArray(parser, ctx);
        let lexeme = parser.peek();
        if (lexeme.type === "&") {
            ParseMethods.setState({"step": ["$join"]});
            parser.accept();
            let right = ParseMethods.parseType(parser, ctx);
            let type = new JoinType(loc, left, right);
            return type;
        }
        parser.reject();
        return left;
    }

    @trackState()
    static parseTypeArray(parser: Parser, ctx: Context): DataType {
        let loc = parser.loc();
        let type = ParseMethods.parseTypeGroup(parser, ctx);
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

    @trackState()
    static parseTypeGroup(parser: Parser, ctx: Context): DataType {
        let loc = parser.loc();
        let lexeme = parser.peek();
        let type: DataType | null = null;

        if (lexeme.type === "(") {
            parser.accept();
            // type = parseType(parser, ctx);
            let types = ParseMethods.parseTypeList(parser, ctx);

            if (types.length > 1) {
                type = new TupleType(loc, types);
            } else {
                type = types[0];
            }
            parser.expect(")");
        } else {
            parser.reject();
            type = ParseMethods.parseTypePrimary(parser, ctx);
        }

        lexeme = parser.peek();
        if (lexeme.type === "?") {
            parser.accept();
            type = new NullableType(loc, type);
        } else {
            parser.reject();
        }

        return type;
    }

    @trackState()
    static parseTypePrimary(parser: Parser, ctx: Context): DataType {
        let loc = parser.loc();
        let lexeme = parser.peek();
        ParseMethods.setState({"expectedTokens": [
            "$identifier",
            "enum",
            "struct",
            "variant",
            "interface",
            "fn",
            "cfn",
            "class",
            "impl",
            "coroutine",
            "$basicType",
        ]});
        if (lexeme.type === "identifier") {
            parser.reject();
            return ParseMethods.parseTypeReference(parser, ctx);
        }
        if (lexeme.type === "enum") {
            parser.reject();
            return ParseMethods.parseTypeEnum(parser, ctx);
        }

        if (lexeme.type === "struct" || lexeme.type === "{") {
            parser.reject();
            return ParseMethods.parseTypeStruct(parser, ctx);
        }

        if (lexeme.type === "variant") {
            parser.reject();
            return ParseMethods.parseTypeVariant(parser, ctx);
        }

        if (lexeme.type === "interface") {
            parser.reject();
            return ParseMethods.parseTypeInterface(parser, ctx);
        }

        if (lexeme.type === "fn" || lexeme.type === "cfn") {
            parser.reject();
            return ParseMethods.parseTypeFunction(parser, ctx);
        }

        if (lexeme.type === "class") {
            parser.reject();
            return ParseMethods.parseTypeClass(parser, ctx);
        }

        if (lexeme.type === "impl") {
            parser.reject();
            return ParseMethods.parseTypeImplementation(parser, ctx);
        }
        if (lexeme.type === "coroutine") {
            parser.reject();
            return ParseMethods.parseTypeCoroutine(parser, ctx);
        }

        /*
        if(lexeme.type === "process") {
            parser.reject();
            return parseTypeProcess(parser, ctx);
        }
        */

        if (
            [
                "u8",
                "u16",
                "u32",
                "u64",
                "i8",
                "i16",
                "i32",
                "i64",
                "f32",
                "f64",
            ].includes(lexeme.type)
        ) {
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

        parser.customError(`Unexpected token "${lexeme.type}"`, loc);
    }

    @trackState()
    static parseTypeCoroutine(parser: Parser, ctx: Context): DataType {
        let loc = parser.loc();
        parser.expect("coroutine");
        parser.expect("<");
        ParseMethods.setState({"step": ["$type"]});
        let fnType = ParseMethods.parseTypeFunction(parser, ctx);
        parser.expect(">");
        return new CoroutineType(loc, fnType as FunctionType);
    }

    @trackState()
    static parseTypeEnum(parser: Parser, ctx: Context): DataType {
        let loc = parser.loc();
        parser.expect("enum");
        ParseMethods.setState({"step": ["$enumBaseType"]});
        let lexeme = parser.peek();
        let base: EnumTargetType = "unset";

        if (lexeme.type === "as") {
            parser.accept();
            let base_str = ParseMethods.parseType(parser, ctx).kind;
            if (
                ["u8", "u16", "u32", "u64", "i8", "i16", "i32", "i64"].includes(
                    base_str,
                )
            ) {
                base = base_str as EnumTargetType;
            } else {
                parser.customError(
                    `Unexpected enum base type "${base_str}", must be a valid datatype`,
                    loc,
                );
            }
        } else {
            parser.reject();
        }

        parser.expect("{");
        ParseMethods.setState({"step": ["$enumValues"]});
        let canLoop = true;
        let values: EnumField[] = [];
        while (canLoop) {
            ParseMethods.setState({"step": ["$enumFieldName"]});
            let id = parser.expect("identifier");
            lexeme = parser.peek();

            if (lexeme.type === "=") {
                ParseMethods.setState({"step": ["$enumFieldValue"]});
                parser.accept();
                let vtok = parser.peek();
                if (
                    [
                        "int_literal",
                        "binary_int_literal",
                        "oct_int_literal",
                        "hex_int_literal",
                    ].includes(vtok.type)
                ) {
                    let value = vtok.value;
                    values.push(
                        new EnumField(
                            id.location,
                            id.value,
                            value,
                            vtok.type as
                                | "int_literal"
                                | "binary_int_literal"
                                | "oct_int_literal"
                                | "hex_int_literal",
                        ),
                    );
                    parser.accept();
                } else {
                    parser.customError(
                        `Unexpected enum value "${vtok.type}", must be an integer (dec, bin, oct, hex) literal`,
                        vtok.location,
                    );
                }
            } else {
                parser.reject();
                values.push(new EnumField(id.location, id.value));
            }

            lexeme = parser.peek();
            canLoop = lexeme.type === ",";
            if (canLoop) {
                parser.accept();
                let tok = parser.peek();
                if (tok.type === "}") {
                    canLoop = false;
                }

                // reject in all cases
                parser.reject();
            } else {
                parser.reject();
            }
        }
        parser.expect("}");

        return new EnumType(loc, values, base);
    }

    @trackState()
    static parseTypeReference(parser: Parser, ctx: Context): DataType {
        //const refName = parser.expect("identifier").value;
        let loc = parser.loc();
        ParseMethods.setState({"step": ["package"]});
        let ref = ParseMethods.parsePackageReference(parser, ctx);
        let lexeme = parser.peek();
        if (lexeme.type === "<") {
            ParseMethods.setState({"step": ["$genericArgDecl"]});
            parser.accept();
            const types = ParseMethods.parseTypeList(parser, ctx);
            parser.expect(">");
            return new ReferenceType(loc, ref, types, ctx);
        } else {
            parser.reject();
        }

        return new ReferenceType(loc, ref, [], ctx);
    }

    @trackState()
    static parseTypeStruct(parser: Parser, ctx: Context): DataType {
        let loc = parser.loc();
        let lexeme = parser.peek();
        parser.reject();
        if (lexeme.type === "struct") {
            parser.expect("struct");
        }
        parser.expect("{");
        ParseMethods.setState({"step": ["$structFields"]});
        let fields = ParseMethods.parseStructFields(parser, ctx);
        let type = new StructType(loc, fields);
        parser.expect("}");
        return type;
    }

    @trackState()
    static parseTypeVariant(parser: Parser, ctx: Context): DataType {
        let loc = parser.loc();
        parser.expect("variant");
        ParseMethods.setState({"step": ["$variantConstructors"]});
        parser.expect("{");
        let constructors = ParseMethods.parseVariantConstructor(parser, ctx);
        parser.expect("}");
        let type = new VariantType(loc, constructors);
        return type;
    }

    @trackState()
    static parseTypeInterface(parser: Parser, ctx: Context): DataType {
        let loc = parser.loc();
        parser.expect("interface");
        ParseMethods.setState({"step": ["$interfaceSuperTypes"]});
        let superTypes: DataType[] = [];
        let lexeme = parser.peek();
        if (lexeme.type != "{") {
            parser.reject();
            superTypes = ParseMethods.parseTypeList(parser, ctx);
        } else {
            parser.reject();
        }

        parser.expect("{");
        ParseMethods.setState({"step": ["$interfaceMethods"]});
        let canLoop = true;
        let methods: InterfaceMethod[] = [];

        while (canLoop) {
            let parsedMethods = ParseMethods.parseMethodInterface(parser, ctx);
            for(let method of parsedMethods) {
                // in interfaces, replace unset with void
                if (method.header.returnType.kind == "unset") {
                    method.header.returnType = new VoidType(
                        method.header.returnType.location,
                    );
                }
                if (method.isStatic) {
                    parser.customError(
                        "Interfaces cannot have static methods",
                        method.location,
                    );
                }

                methods.push(method);
            }

            lexeme = parser.peek();
            canLoop = lexeme.type != "}";
            parser.reject();
        }

        parser.expect("}");

        // assert all superTypes are reference types
        for (let t of superTypes) {
            if (!(t instanceof ReferenceType)) {
                ctx.parser.customError(
                    "Interfaces can only inherit from other interfaces",
                    loc,
                );
            }
        }

        // make sure no method is called init, if found throw error at its location
        methods.forEach((method) => {
            if (method.name == "init") {
                ctx.parser.customError(
                    "Interfaces cannot have methods called init",
                    method.location,
                );
            }
        });

        return new InterfaceType(loc, methods, superTypes as ReferenceType[]);
    }


    // format 'impl' <reference type> '(' attribute_names* ')'
    @trackState()
    static parseClassImplementation(parser: Parser, ctx: Context): ClassImplementation {
        parser.expect("impl");
        let type = ParseMethods.parseTypeReference(parser, ctx);
        parser.expect("(");
        
        let tok = parser.peek();
        let canLoop = tok.type !== ")";
        let attributes: string[] = [];

        parser.reject();

        while(canLoop) {
            let id = parser.expect("identifier");
            attributes.push(id.value);
            tok = parser.peek();
            if(tok.type === ",") {
                parser.accept();
            }
            else {
                parser.reject();
            }

            tok = parser.peek();
            canLoop = tok.type !== ")";
            parser.reject();
        }

        parser.expect(")");
        return new ClassImplementation(type, attributes);
    }

    @trackState()
    static parseTypeClass(parser: Parser, ctx: Context): ClassType {
        let loc = parser.loc();
        parser.expect("class");
        let superTypes: DataType[] = [];
        let lexeme = parser.peek();
        if (lexeme.type != "{") {
            parser.reject();
            ParseMethods.setState({"step": ["superTypes"]});
            superTypes = ParseMethods.parseTypeList(parser, ctx);
        } else {
            parser.reject();
        }
        parser.expect("{");

        let canLoop = true;
        let attributes: ClassAttribute[] = [];
        let methods: ClassMethod[] = [];
        let staticBlock: BlockStatement | null = null;
        let staticBlockCtx: Context | null = null;
        let impls: ClassImplementation[] = [];

        while (canLoop) {
            let tok = parser.peek();
            ParseMethods.setState({"expectedTokens": ["let", "static", "impl"]});
            if (tok.type === "let") {
                parser.accept();

                let loop = true;
                while (loop) {
                    parser.reject();
                    let attribute = ParseMethods.parseClassAttribute(parser, ctx);
                    if (methods.find((m) => m.imethod.name == attribute.name)) {
                        parser.customError(
                            `Duplicate attribute "${attribute.name}" in class`,
                            attribute.location,
                        );
                    }
                    // also comapre it with attributes
                    if (attributes.find((a) => a.name == attribute.name)) {
                        parser.customError(
                            `Duplicate name attributes "${attribute.name}" is already reserved by a method, in class`,
                            attribute.location,
                        );
                    }
                    attributes.push(attribute);

                    tok = parser.peek();
                    loop = tok.type === ",";

                    if(loop) {
                        parser.accept();
                    }
                    else {
                        parser.reject();
                    }
                }

            } else if (tok.type === "static") {
                let tok2 = parser.peek();
                if (tok2.type === "{") {
                    // Static block
                    // make sure we don"t have more than one static block
                    if (staticBlock != null) {
                        parser.customError(
                            "Duplicate static block in class, can only have one",
                            tok.location,
                        );
                    }
                    parser.rejectOne();
                    parser.accept();
                    staticBlockCtx = new Context(tok.location, parser, ctx, { withinClassStaticBlock: true, withinClass: true });
                    staticBlock = ParseMethods.parseStatementBlock(parser, staticBlockCtx);
                } else if (tok2.type === "fn") {
                    parser.rejectOne();// reject the fn
                    parser.accept();// accept the static
                    let parsedMethods = ParseMethods.parseClassMethod(parser, ctx);
                    for(let method of parsedMethods) {
                        if(method.isOverride) {
                            parser.customError(
                                `Cannot override method "${method.imethod.name}" in static block`,
                                method.location,
                            );
                        }
                        method.imethod.isStatic = true;
                    }

                    // also comapre it with attributes
                    for(let method of parsedMethods) {
                        if (attributes.find((a) => a.name == method.imethod.name)) {
                            parser.customError(
                                `Duplicate name method "${method.imethod.name}" is already reserved by an attribute, in class`,
                            method.location,
                            );
                        }
                        methods.push(method);
                    }
                    
                }
            } else if (tok.type === "override") {
                parser.accept();
                let parsedMethods = ParseMethods.parseClassMethod(parser, ctx);
                for(let method of parsedMethods) {
                    // also comapre it with attributes
                    if (attributes.find((a) => a.name == method.imethod.name)) {
                        parser.customError(
                            `Duplicate name method "${method.imethod.name}" is already reserved by an attribute, in class`,
                            method.location,
                        );
                    }
                    method.isOverride = true;
                    methods.push(method);
                }
            }
            else if (tok.type === "fn") {
                parser.reject();
                let parsedMethods = ParseMethods.parseClassMethod(parser, ctx);
                for(let method of parsedMethods) {
                    // also comapre it with attributes
                    if (attributes.find((a) => a.name == method.imethod.name)) {
                        parser.customError(
                            `Duplicate name method "${method.imethod.name}" is already reserved by an attribute, in class`,
                            method.location,
                        );
                    }
                    methods.push(method);
                }
            } else if (tok.type === "impl") {
                parser.reject();
                let impl = ParseMethods.parseClassImplementation(parser, ctx);
                impls.push(impl);
            } else {
                parser.reject();
                canLoop = false;
            }
        }

        parser.expect("}");

        let c = new ClassType(
            loc,
            superTypes as ReferenceType[],
            attributes,
            methods,
            impls,
        );
        if(staticBlockCtx) {
            staticBlockCtx.setActiveClass(c);
        }
        c.setStaticBlock(staticBlock);

        return c;
    }

    @trackState()
    static parseTypeImplementation(parser: Parser, ctx: Context): DataType {
        let loc = parser.loc();
        parser.expect("impl");
        let forType: DataType | null = null;

        // check if we have `for` next
        let tok = parser.peek();
        if (tok.type === "for") {
            ParseMethods.setState({"step": ["superType"]});
            parser.accept();
            forType = ParseMethods.parseType(parser, ctx);
        }
        else {
            parser.reject();
        }

        parser.expect("(");
        let attributes = ParseMethods.parseImplementationAttributeList(parser, ctx);
        parser.expect(")");

        parser.expect("{");
        let methods = ParseMethods.parseImplementationMethodList(parser, ctx);
        parser.expect("}");

        let t = new ImplementationType(loc, attributes, forType, methods);
        return t;
    }

    @trackState()
    static parseTypeFunction(parser: Parser, ctx: Context): DataType {
        let tok = parser.expect(["fn", "cfn"]);
        let header = ParseMethods.parseFnTypeBody(parser, ctx);
        header.isCoroutine = tok.type === "cfn";
        // if the return type is unset, we change it to void (since it"s a fn type)
        if (header.returnType.kind == "unset") {
            header.returnType = new VoidType(header.returnType.location);
        }
        return header;
    }

    @trackState()
    static parseClassAttribute(parser: Parser, ctx: Context): ClassAttribute {
        let loc = parser.loc();

        let tok = parser.peek();
        ParseMethods.setState({"step": ["modifiers"]});
        ParseMethods.setState({"expectedTokens": ["static", "const", "identifier"]});
        // we have const, static, static const or const static
        let isStatic = tok.type === "static";
        let isConst = tok.type === "const";

        if (isStatic) {
            parser.accept();
            let tok2 = parser.peek();
            if (tok2.type === "const") {
                parser.accept();
                isConst = true;
            } else {
                parser.reject();
            }
        } else if (isConst) {
            parser.accept();
            let tok2 = parser.peek();
            if (tok2.type === "static") {
                parser.accept();
                isStatic = true;
            } else {
                parser.reject();
            }
        } else {
            parser.reject();
        }
        ParseMethods.setState({"step": ["name"]});
        let id = parser.expect("identifier");
        parser.expect(":");
        ParseMethods.setState({"step": ["$type"]});
        let type = ParseMethods.parseType(parser, ctx);
        return new ClassAttribute(loc, id.value, type, isStatic, isConst);
    }

    @trackState()
    static parseImplementationAttributeList(parser: Parser, ctx: Context): ImplementationAttribute[] {
        let attributes: ImplementationAttribute[] = [];
        let tok = parser.peek();
        let canLoop = tok.type !== ")";

        while (canLoop) {
            let attr = ParseMethods.parseImplementationAttribute(parser, ctx);
            attributes.push(attr);
            tok = parser.peek();
            
            if(tok.type === ",") {
                parser.accept();
            }
            else {
                parser.reject();
            }

            tok = parser.peek();
            canLoop = tok.type !== ")";
            parser.reject();
        }

        parser.reject();
        return attributes;
    }

    @trackState()
    static parseImplementationAttribute(parser: Parser, ctx: Context): ImplementationAttribute {
        let loc = parser.loc();
        let tok = parser.peek();

        ParseMethods.setState({"step": ["modifiers"]});
        ParseMethods.setState({"expectedTokens": ["static", "const", "identifier"]});

        // we have const, static, static const or const static
        let isStatic = tok.type === "static";
        let isConst = tok.type === "const";

        if (isStatic) {
            parser.accept();
            let tok2 = parser.peek();
            if (tok2.type === "const") {
                parser.accept();
                isConst = true;
            } else {
                parser.reject();
            }
        } else if (isConst) {
            parser.accept();
            let tok2 = parser.peek();
            if (tok2.type === "static") {
                parser.accept();
                isStatic = true;
            } else {
                parser.reject();
            }
        } else {
            parser.reject();
        }

        let id = parser.expect("identifier");
        parser.expect(":");
        let type = ParseMethods.parseType(parser, ctx);
        return new ImplementationAttribute(loc, id.value, type, isStatic, isConst);
    }

    @trackState()
    static parseClassMethod(
        parser: Parser,
        ctx: Context
    ): ClassMethod[] {
        let loc = parser.loc();

        ParseMethods.setState({"step": ["fnHeader"]});
        let {imethod, altNames} = ParseMethods.parseClassMethodInterface(parser, ctx);
        let body: BlockStatement | null = null;
        let expression: Expression | null = null;

        // create method ctx and capture return statements
        let methodScope = new Context(loc, parser, ctx, {
            withinClass: true,
            withinFunction: true,
        });
        methodScope.location = loc;

        let fn = new ClassMethod(loc, methodScope, imethod, null, null);

        methodScope.setOwner(fn);

        if (parser.peek().type === "=") {
            parser.accept();
            ParseMethods.setState({"step": ["$expression"]});
            expression = ParseMethods.parseExpression(parser, methodScope, {
                allowNullable: false,
            });
        } else {
            parser.reject();
            ParseMethods.setState({"step": ["$body"]});
            body = ParseMethods.parseStatementBlock(parser, methodScope);
        }

        fn.expression = expression;
        fn.body = body;

        methodScope.endLocation = parser.loc();

        let allmethods = [fn];

        let emptyTypeMap: { [key: string]: DataType } = {};
        for(let altName of altNames) {
            
            let newMethod = fn.clone(emptyTypeMap, true);
            newMethod.imethod.name = altName;
            allmethods.push(newMethod);
        }

        return allmethods;
    }

    @trackState()
    static parseImplementationMethodList(parser: Parser, ctx: Context): ImplementationMethod[] {
        let methods: ImplementationMethod[] = [];
        let tok = parser.peek();
        let canLoop = tok.type !== "}";
        parser.reject();
        while (canLoop) {
            let parsedMethods = ParseMethods.parseImplementationMethod(parser, ctx);
            for(let method of parsedMethods) {
                methods.push(method);
            }

            tok = parser.peek();
            canLoop = tok.type !== "}";
            parser.reject();
        }

        return methods;
    }

    @trackState()
    static parseImplementationMethod(
        parser: Parser,
        ctx: Context
    ): ImplementationMethod[] {
        let loc = parser.loc();

        ParseMethods.setState({"step": ["fnHeader"]});
        let fnProtos = ParseMethods.parseMethodInterface(parser, ctx);
        let body: BlockStatement | null = null;
        let expression: Expression | null = null;

        // create method ctx and capture return statements
        let methodScope = new Context(loc, parser, ctx, {
            withinImplementation: true,
            withinFunction: true,
        });
        methodScope.location = loc;

        let fn = new ImplementationMethod(loc, methodScope, fnProtos[0], null, null);
        methodScope.setOwner(fn);

        if (parser.peek().type === "=") {
            parser.accept();
            ParseMethods.setState({"step": ["$expression"]});
            expression = ParseMethods.parseExpression(parser, methodScope, {
                allowNullable: false,
            });
        } else {
            parser.reject();
            ParseMethods.setState({"step": ["$body"]});
            body = ParseMethods.parseStatementBlock(parser, methodScope);
        }

        fn.expression = expression;
        fn.body = body;

        methodScope.endLocation = parser.loc();

        if(fnProtos.length == 1) {
            return [fn];
        }

        let allMethods: ImplementationMethod[] = [fn];
        let emptyTypeMap: { [key: string]: DataType } = {};
        for(let i = 1; i < fnProtos.length; i++) {
            let newMethod = fn.clone(emptyTypeMap, true);
            newMethod.imethod.name = fnProtos[i].name;
            allMethods.push(newMethod);
        }

        return allMethods;
    }

    /**
     * Expressions
     */

    @trackState()
    static parseExpression(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let expr = ParseMethods.parseExpressionLet(parser, ctx, opts);
        if (expr == null && !opts.allowNullable) {
            /*

            if (expr == null && !opts.allowNullable) {
                // Log error instead of throwing
                parser.basePackage.logs.push({
                    type: "error",
                    message: "Invalid expression!",
                    line: parser.loc().line,
                    column: parser.loc().col,
                    file: parser.loc().file,
                    length: 1,
                });
                // Return a placeholder node
                return new UnreachableExpression(parser.loc());
            }
            */
            parser.customError("Invalid expression!", parser.loc());
        }

        return expr;
    }

    @trackState()
    static parseExpressionLet(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let lexeme = parser.peek();
        if (lexeme.type === "let") {
            parser.accept();
            // create new ctx in which to register new variables
            // and parse <in> expression
            let newScope = new Context(loc, parser, ctx);
            newScope.location = loc;
            let variables = ParseMethods.parseVariableDeclarationList(parser, newScope);
            parser.expect("in");
            let body = ParseMethods.parseExpression(parser, newScope, opts);
            newScope.endLocation = parser.loc();
            return new LetInExpression(loc, newScope, variables, body);
        } else {
            parser.reject();
            return ParseMethods.parseExpressionMatch(parser, ctx, opts);
        }
    }

    @trackState()
    static parseExpressionMatch(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let lexeme = parser.peek();
        if (lexeme.type === "match") {
            ParseMethods.setState({"step": ["expression"]});
            parser.accept();
            let expression = ParseMethods.parseExpression(parser, ctx, opts);
            ParseMethods.setState({"expression": expression});
            parser.expect("{");
            ParseMethods.setState({"step": ["cases"]});
            let cases: MatchCaseExpression[] = ParseMethods.parseMatchCases(parser, ctx, "expr");

            // make sure we have at least one case
            if (cases.length == 0) {
                parser.customError(
                    "Match expression must have at least one case",
                    loc,
                );
            }

            // make sure we always have a default case, as the last case
            let lastCase = cases[cases.length - 1];
            if (!(lastCase.pattern instanceof WildCardPatternExpression)) {
                parser.customError(
                    "Match expression must have a default wild case expression as last case",
                    loc,
                );
            }

            parser.expect("}");
            return new MatchExpression(loc, expression, cases);
        } else {
            parser.reject();
            return ParseMethods.parseExpressionOpAssign(parser, ctx, opts);
        }
    }

    // =, +=, -=, *=, /=, %=
    @trackState()
    static parseExpressionOpAssign(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionConditional(parser, ctx, opts);
        let lexeme = parser.peek();
        if (
            lexeme.type === "=" ||
            lexeme.type === "+=" ||
            lexeme.type === "-=" ||
            lexeme.type === "*=" ||
            lexeme.type === "/=" ||
            lexeme.type === "%="
        ) {
            parser.accept();
            ParseMethods.setState({"op": [lexeme.type]});
            ParseMethods.setState({"left": left});
            let right = ParseMethods.parseExpressionOpAssign(parser, ctx, opts);

            if(lexeme.type === "+=" && left instanceof ThisExpression && (right instanceof UnnamedStructConstructionExpression || right instanceof NamedStructConstructionExpression)) {
                ParseMethods.setState({"step": ["thisDistributedAssign"]});
                return new ThisDistributedAssignExpression(loc, left, right);
            }

            if (lexeme.type === "=") {
                if (left.kind === "index_access") {
                    ParseMethods.setState({"step": ["indexSet"]});
                    let indexAccess = left as IndexAccessExpression;
                    return new IndexSetExpression(
                        loc,
                        indexAccess.lhs,
                        indexAccess.indexes,
                        right,
                    );
                }
                if(left.kind === "reverse_index_access") {
                    ParseMethods.setState({"step": ["reverseIndexSet"]});
                    let reverseIndexAccess = left as ReverseIndexAccessExpression;
                    return new ReverseIndexSetExpression(
                        loc,
                        reverseIndexAccess.lhs,
                        reverseIndexAccess.index,
                        right,
                    );
                }
            }

            ParseMethods.setState({"step": ["binaryExpression"]});
            return new BinaryExpression(
                loc,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
        }
        parser.reject();
        return left;
    }

    // if.., if .. else
    @trackState()
    static parseExpressionConditional(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let lexeme = parser.peek();
        if (lexeme.type === "if") {
            let loc = parser.loc();
            parser.accept();
            ParseMethods.setState({"step": ["ifs"]});
            let ifs: Expression[] = [];
            let bodies: Expression[] = [];

            let canLoop = true;
            while (canLoop) {
                let loc = parser.loc();
                let condition = ParseMethods.parseExpression(parser, ctx, opts);
                ParseMethods.setState({"step": ["condition"]});
                ParseMethods.setState({"condition": condition});
                ifs.push(condition);
                parser.expect("=>");
                ParseMethods.setState({"step": ["body"]});
                let body = ParseMethods.parseExpression(parser, ctx, opts);
                bodies.push(body);

                lexeme = parser.peek();
                canLoop = lexeme.type === "else";
                let nextLexeme = parser.peek();
                canLoop = canLoop && nextLexeme.type === "if";
                if (canLoop) {
                    parser.accept();
                } else {
                    parser.reject();
                }
            }
            parser.expect("else");
            let elseBody = ParseMethods.parseExpression(parser, ctx, opts);
            return new IfElseExpression(loc, ifs, bodies, elseBody);
        } else {
            parser.reject();
            return ParseMethods.parseCoalescingOp(parser, ctx, opts);
        }
    }

    // ||
    @trackState()
    static parseCoalescingOp(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionLogicalOr(parser, ctx, opts);
        let lexeme = parser.peek();

        while (lexeme.type === "??") {
            ParseMethods.setState({"op": ["??"]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseExpressionLogicalOr(parser, ctx, opts);
            left = new BinaryExpression(
                loc,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
            lexeme = parser.peek();
        }

        parser.reject();
        return left;
    }

    // ||
    @trackState()
    static parseExpressionLogicalOr(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionLogicalAnd(parser, ctx, opts);
        let lexeme = parser.peek();

        while (lexeme.type === "||") {
            ParseMethods.setState({"op": ["||"]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseExpressionLogicalAnd(parser, ctx, opts);
            left = new BinaryExpression(
                loc,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
            lexeme = parser.peek();
        }

        parser.reject();
        return left;
    }

    // &&
    @trackState()
    static parseExpressionLogicalAnd(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionBitwiseInclusiveOr(parser, ctx, opts);
        let lexeme = parser.peek();

        while (lexeme.type === "&&") {
            ParseMethods.setState({"op": ["&&"]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseExpressionBitwiseInclusiveOr(parser, ctx, opts);
            left = new BinaryExpression(
                loc,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
            lexeme = parser.peek();
        }

        parser.reject();
        return left;
    }

    // |
    @trackState()
    static parseExpressionBitwiseInclusiveOr(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionBitwiseXOR(parser, ctx, opts);
        let lexeme = parser.peek();

        while (lexeme.type === "|") {
            ParseMethods.setState({"op": ["|"]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseExpressionBitwiseXOR(parser, ctx, opts);
            left = new BinaryExpression(
                loc,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
            lexeme = parser.peek();
        }

        parser.reject();
        return left;
    }

    // ^
    @trackState()
    static parseExpressionBitwiseXOR(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionBitwiseAND(parser, ctx, opts);
        let lexeme = parser.peek();

        while (lexeme.type === "^") {
            ParseMethods.setState({"op": ["^"]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseExpressionBitwiseAND(parser, ctx, opts);
            left = new BinaryExpression(
                loc,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
            lexeme = parser.peek();
        }

        parser.reject();
        return left;
    }

    @trackState()
    static parseExpressionBitwiseAND(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionEquality(parser, ctx, opts);
        let lexeme = parser.peek();

        while (lexeme.type === "&") {
            ParseMethods.setState({"op": ["&"]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseExpressionEquality(parser, ctx, opts);
            left = new BinaryExpression(
                loc,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
            lexeme = parser.peek();
        }

        parser.reject();
        return left;
    }

    // ==, !=
    @trackState()
    static parseExpressionEquality(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionRelational(parser, ctx, opts);
        let lexeme = parser.peek();

        while (lexeme.type === "==" || lexeme.type === "!=") {
            ParseMethods.setState({"op": [lexeme.type]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseExpressionRelational(parser, ctx, opts);
            left = new BinaryExpression(
                loc,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
            lexeme = parser.peek();
        }

        parser.reject();
        return left;
    }

    // <, <=, >, >=
    @trackState()
    static parseExpressionRelational(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionShift(parser, ctx, opts);
        let lexeme = parser.peek();

        // Use a while loop to handle sequences of relational operations
        while (
            lexeme.type === "<" ||
            lexeme.type === "<=" ||
            lexeme.type === ">" ||
            lexeme.type === ">="
        ) {
            ParseMethods.setState({"op": [lexeme.type]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseExpressionShift(parser, ctx, opts);
            left = new BinaryExpression(
                loc,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
            lexeme = parser.peek();
        }

        parser.reject();
        return left;
    }

    // <<, >>
    @trackState()
    static parseExpressionShift(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionAdditive(parser, ctx, opts);
        let lexeme = parser.peek();

        while (lexeme.type === "<<" || lexeme.type === ">>") {
            ParseMethods.setState({"op": [lexeme.type]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseExpressionAdditive(parser, ctx, opts);
            left = new BinaryExpression(
                loc,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
            lexeme = parser.peek();
        }

        parser.reject();
        return left;
    }

    // +, -
    @trackState()
    static parseExpressionAdditive(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let left = ParseMethods.parseExpressionMultiplicative(parser, ctx, opts);
        let lexeme = parser.peek();

        while (lexeme.type === "+" || lexeme.type === "-") {
            ParseMethods.setState({"op": [lexeme.type]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseExpressionMultiplicative(parser, ctx, opts);
            left = new BinaryExpression(
                lexeme.location,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
            lexeme = parser.peek();
        }
        parser.reject();
        return left;
    }

    @trackState()
    static parseExpressionMultiplicative(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionInstance(parser, ctx, opts);
        let lexeme = parser.peek();

        while (lexeme.type === "*" || lexeme.type === "/" || lexeme.type === "%") {
            ParseMethods.setState({"op": [lexeme.type]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseExpressionInstance(parser, ctx, opts);
            left = new BinaryExpression(
                loc,
                left,
                right,
                lexeme.type as BinaryExpressionOperator,
            );
            lexeme = parser.peek();
        }

        parser.reject();
        return left;
    }

    @trackState()
    static parseExpressionInstance(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let left = ParseMethods.parseExpressionUnary(parser, ctx, opts);
        let lexeme = parser.peek();
        if (lexeme.type === "is") {
            ParseMethods.setState({"op": ["is"]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let right = ParseMethods.parseType(parser, ctx);
            return new (
                lexeme.type === "is" ? InstanceCheckExpression : CastExpression
            )(lexeme.location, left, right);
        }
        if (
            lexeme.type === "as" ||
            lexeme.type === "as!" ||
            lexeme.type === "as?"
        ) {
            ParseMethods.setState({"op": [lexeme.type]});
            ParseMethods.setState({"left": left});
            parser.accept();
            let loop = true;
            while (loop) {
                parser.accept();
                let right = ParseMethods.parseType(parser, ctx);
                let cast = new CastExpression(
                    lexeme.location,
                    left,
                    right,
                    lexeme.type === "as"
                        ? "regular"
                        : lexeme.type === "as!"
                        ? "force"
                        : "safe",
                );
                left = cast;
                lexeme = parser.peek();
                // TODO:
                //  if(((lexeme.type !== "as") && (lexeme.type !== "as!")) && (lexeme.type !== "as?")) {
                if (lexeme.type !== "as" && lexeme.type !== "as!") {
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
    @trackState()
    static parseExpressionUnary(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let lexeme = parser.peek();
        if (
            lexeme.type === "++" ||
            lexeme.type === "--" ||
            lexeme.type === "+" ||
            lexeme.type === "-" ||
            lexeme.type === "!" ||
            lexeme.type === "~"
        ) {
            parser.accept();
            ParseMethods.setState({"op": [lexeme.type]});
            let expression = ParseMethods.parseExpressionUnary(parser, ctx, opts);
            ParseMethods.setState({"unary": expression});
            if (lexeme.type === "++" || lexeme.type === "--") {
                return new UnaryExpression(
                    loc,
                    expression,
                    ("pre" + lexeme.type) as unknown as UnaryOperator,
                );
            }
            return new UnaryExpression(
                loc,
                expression,
                lexeme.type as unknown as UnaryOperator,
            );
        } else if (lexeme.type === "new") {
            ParseMethods.setState({"op": ["new"]});
            parser.accept();
            let type = ParseMethods.parseType(parser, ctx);
            ParseMethods.setState({"type": type});
            parser.expect("(");
            lexeme = parser.peek();
            parser.reject();
            let args =
                lexeme.type == ")" ? [] : ParseMethods. parseExpressionList(parser, ctx, opts);
            parser.expect(")");
            ParseMethods.setState({"args": args});
            return new NewExpression(loc, type, args);
        } else if (lexeme.type === "yield" || lexeme.type === "yield!") {
            parser.accept();
            let returnExpr = ParseMethods.parseExpression(parser, ctx, opts);

            let yieldExpr = new YieldExpression(
                loc,
                returnExpr,
                lexeme.type === "yield!",
            );

            let parentFunction = ctx.findParentFunction();

            // make sure the parent @trackState()
            if (
                parentFunction instanceof DeclaredFunction ||
                parentFunction instanceof LambdaExpression
            ) {
                parentFunction.isCoroutineCallable = true;
                // cannot mix yield and return statements
                if (parentFunction.returnStatements.length != 0) {
                    parser.customError(
                        "Cannot use yield expression inside a @trackState() function with return statements",
                        loc,
                    );
                }
                parentFunction.yieldExpressions.push({ yield: yieldExpr, ctx });
            } else {
                parser.customError(
                    "yield expression must be inside a regular @trackState() function or lambda",
                    loc,
                );
            }

            return yieldExpr;
        } else if (lexeme.type === "coroutine") {
            parser.accept();
            //parser.expect("(");
            let baseFn = ParseMethods.parseExpression(parser, ctx, opts);
            //parser.expect(")");
            return new CoroutineConstructionExpression(loc, baseFn);
        } else if (lexeme.type === "mutate") {
            parser.accept();
            let expression = ParseMethods.parseExpression(parser, ctx, opts);
            return new MutateExpression(loc, expression);
        } else if (lexeme.type === "unreachable") {
            parser.accept();
            return new UnreachableExpression(loc);
        } else {
            parser.reject();
            return ParseMethods.parseExpressionPostfix(parser, ctx, opts);
        }
    }

    // ++ (post), -- (post)
    @trackState()
    static parseExpressionPostfix(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let expression = ParseMethods.parseExpressionPrimary(parser, ctx, opts);
        let lexeme = parser.peek();
        if (lexeme.type === "++" || lexeme.type === "--") {
            ParseMethods.setState({"unary": expression});
            ParseMethods.setState({"op": [lexeme.type]});
            parser.accept();
            return new UnaryExpression(
                loc,
                expression,
                ("post" + lexeme.type) as unknown as UnaryOperator,
            );
        }
        parser.reject();
        if (expression == null) {
            return expression;
        }

        return ParseMethods.parseExpressionMemberSelection(parser, ctx, expression, opts);
    }

    // ., ?., (), [] and denull
    @trackState()
    static parseExpressionMemberSelection(
        parser: Parser,
        ctx: Context,
        lhs: Expression,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let lexeme = parser.peek();
        if (parser.isOnANewLine()) {
            parser.reject();
            return lhs;
        }

        if (lexeme.type === "!") {
            ParseMethods.setState({"op": ["!!"]});
            ParseMethods.setState({"unary": lhs});
            parser.accept();
            let newLHS = new UnaryExpression(loc, lhs, "!!");
            return ParseMethods.parseExpressionMemberSelection(parser, ctx, newLHS, opts);
        }
        if (lexeme.type === "." || lexeme.type === "?.") {
            ParseMethods.setState({"op": [lexeme.type]});
            ParseMethods.setState({"left": lhs});
            parser.accept();
            // this often throws an error, so we manually assert that the rhs is an identifier
            let tok = parser.peek();
            if(tok.type != "identifier") {
                parser.customError("Expected identifier after member access.", tok.location);
            }
            parser.reject();

            // we need to reject because we could also have type arguments etc. hence, we
            // go through the rest of the process, though we could optimize this and just crea
            let rhs = ParseMethods.parseExpressionPrimary(parser, ctx, opts);
            if (!(rhs instanceof ElementExpression)) {
                parser.customError("Expected identifier", rhs.location);
            }

            let memberAccess = new MemberAccessExpression(loc, lhs, rhs, lexeme.type === "?.");

            if(ctx.env.withinImplementation) {
                // we need to register the member access expression as a thisMemberAccessExpression
                // for the current implementation method
                let implMethod = ctx.getActiveImplementationMethod();
                // sanity check
                if(!(implMethod instanceof ImplementationMethod)) {
                    throw new Error("Unreachable");
                }
                implMethod.thisMemberAccessExpression.push(memberAccess);
            }
            
            return ParseMethods.parseExpressionMemberSelection(
                parser,
                ctx,
                memberAccess,
                opts,
            );
        }
        if (lexeme.type === "(") {
            ParseMethods.setState({"op": ["()"]});
            ParseMethods.setState({"left": lhs});
            parser.accept();
            lexeme = parser.peek();
            parser.reject();
            let args =
                lexeme.type == ")" ? [] : ParseMethods.parseExpressionList(parser, ctx, opts);
            parser.expect(")");
            return ParseMethods.parseExpressionMemberSelection(
                parser,
                ctx,
                new FunctionCallExpression(loc, lhs, args),
                opts,
            );
        }
        if (lexeme.type === "[") {
            ParseMethods.setState({"op": ["[]"]});
            ParseMethods.setState({"left": lhs});
            parser.accept();
            lexeme = parser.peek();
            parser.reject();
            let index =
                lexeme.type == "]" ? [] : ParseMethods.parseExpressionList(parser, ctx, opts);
            parser.expect("]");

            let indexExpression: Expression;
            if((index.length == 1) && (index[0] instanceof UnaryExpression) && (index[0].operator == "-")) {
                indexExpression = new ReverseIndexAccessExpression(loc, lhs, index[0].expression);
            }
            else {
                indexExpression = new IndexAccessExpression(loc, lhs, index);
            }
            return ParseMethods.parseExpressionMemberSelection(
                parser,
                ctx,
                indexExpression,
                opts,
            );
        }

        parser.reject();
        return lhs;
    }

    // literals, identifiers, parentheses
    @trackState()
    static parseExpressionPrimary(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        let lexeme = parser.peek();

        // parenthesis
        if (lexeme.type === "(") {
            ParseMethods.setState({"step": ["expressionList"]});
            parser.accept();
            let expressionList = ParseMethods.parseExpressionList(parser, ctx, opts);
            parser.expect(")");

            if (expressionList.length == 1) {
                return expressionList[0];
            } else {
                return new TupleConstructionExpression(loc, expressionList);
            }
        }

        if (lexeme.type === "[") {
            ParseMethods.setState({"step": ["arrayConstruction"]});
            parser.reject();
            return ParseMethods.parseArrayConstruction(parser, ctx, opts);
        }

        if (lexeme.type === "{") {
            ParseMethods.setState({"step": ["structConstruction"]});
            parser.reject();
            return ParseMethods.parseStructConstruction(parser, ctx, opts);
        }

        if (lexeme.type === "fn" || lexeme.type === "cfn") {
            ParseMethods.setState({"step": ["lambda"]});
            parser.accept();
            let header = ParseMethods.parseFnTypeBody(parser, ctx);
            header.isCoroutine = lexeme.type === "cfn";
            let newScope = new Context(loc, parser, ctx, { withinFunction: true });
            newScope.location = loc;
            let fn = new LambdaExpression(loc, newScope, header, null, null);
            newScope.setOwner(fn);

            lexeme = parser.peek();
            if (lexeme.type === "{") {
                ParseMethods.setState({"step": ["lambda_body"]});
                parser.reject();
                let body = ParseMethods.parseStatementBlock(parser, newScope);
                fn.body = body;
                newScope.endLocation = parser.loc();
                return fn;
            } else {
                ParseMethods.setState({"step": ["lambda_expression"]});
                parser.reject();
                parser.expect("=");
                let fnBody = ParseMethods.parseExpression(parser, newScope, opts);
                fn.expression = fnBody;
                newScope.endLocation = parser.loc();
                return fn;
            }
        }
        if (lexeme.type === "this") {
            ParseMethods.setState({"step": ["this"]});
            parser.accept();
            return new ThisExpression(loc);
        }

        if (lexeme.isLiteral()) {
            ParseMethods.setState({"step": ["literal"]});
            parser.accept();
            return lexeme.toLiteral();
        }

        if (lexeme.type === "identifier") {
            ParseMethods.setState({"step": ["identifier"]});
            parser.accept();
            let hasG = ParseMethods.parserElementHasGenerics(parser, ctx);
            let genericArgs: DataType[] = [];
            if (hasG) {
                ParseMethods.setState({"step": ["identifier_generics"]});
                parser.expect("<");
                genericArgs = ParseMethods.parseTypeList(parser, ctx);
                parser.expect(">");
            }

            return new ElementExpression(loc, lexeme.value, genericArgs);
        } else if (lexeme.type === "do") {
            ParseMethods.setState({"step": ["do_expression"]});
            parser.accept();
            let newCtx = new Context(loc, parser, ctx, {
                withinDoExpression: true,
            });
            let doExpr = new DoExpression(loc, newCtx, null);
            newCtx.setOwner(doExpr);
            let block = ParseMethods.parseStatementBlock(parser, newCtx);
            doExpr.block = block;
            newCtx.endLocation = parser.loc();

            return doExpr;
        }

        // @ts-ignore
        return null;
    }

    @trackState()
    static parserElementHasGenerics(parser: Parser, ctx: Context) {
        let areOpposed = (c1: string, c2: string) => {
            if (c1 == "[") return c2 == "]";
            if (c1 == "{") return c2 == "}";
            if (c1 == "(") return c2 == ")";
            if (c1 == "<") return c2 == ">";
        };

        let stack: string[] = [];
        let lexeme = parser.peek();
        let depth = 0;
        let line = lexeme.location.line;

        if (lexeme.type === "<") {
            let canLoop = true;
            while (canLoop) {
                lexeme = parser.peek();

                if(lexeme.location.line != line) {
                    parser.reject();
                    return false;
                }

                if (["(", "[", "<", "{"].includes(lexeme.type)) {
                    stack.push(lexeme.type);
                    if(lexeme.type != "<") {
                        depth++;
                    }
                }
                if (["}", ">", "]", ")"].includes(lexeme.type)) {
                    if (stack.length == 0 && lexeme.type == ">") {
                        parser.reject();
                        return true;
                    }

                    let last = stack.pop();
                    if(lexeme.type != ">") {
                        depth--;
                    }
                    if (!last) {
                        parser.reject();
                        return false;
                    }
                    if (!areOpposed(last, lexeme.type)) {
                        parser.reject();
                        return false;
                    }
                }
                if (lexeme.type === ">>") {
                    // if we have two consecutive left brackets, we have a generic type
                    if(stack.length >= 1 && stack[stack.length - 1] == "<") {
                        parser.reject();
                        return true;
                    }
                }

                // if we find any arithmetic operator, we need to check if we are at the top level.
                // so we can avoid cases like x < 0 && y % 0 == 1 for example
                if(["+", "-", "*", "/", "=", "==", "!=", "%", "&", "|", "^", "<<", ">>"].includes(lexeme.type) && depth == 0) {
                    return false;
                }

                canLoop = stack.length > 0 || lexeme.type != "EOF";
            }
        }
        parser.reject();
        return false;
    }

    @trackState()
    static parseArrayConstruction(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        parser.expect("[");
        let lexeme = parser.peek();
        parser.reject();
        let elements =
            lexeme.type == "]" ? [] : ParseMethods.parseExpressionList(parser, ctx, opts, true);
        parser.expect("]");
        return new ArrayConstructionExpression(loc, elements);
    }

    @trackState()
    static parseStructElements(
        parser: Parser,
        ctx: Context,
    ): (StructKeyValueExpressionPair | StructUnpackedElement)[] {
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
                let expression = ParseMethods.parseExpression(parser, ctx, {
                    allowNullable: false,
                });
                elements.push(new StructUnpackedElement(parser.loc(), expression));
            } else if (lexeme.type === "identifier") {
                parser.reject();
                let name = parser.expect("identifier").value;

                let lexeme2 = parser.peek();
                if (lexeme2.type === ":") {
                    parser.accept();
                    elements.push(
                        new StructKeyValueExpressionPair(
                            parser.loc(),
                            name,
                            ParseMethods.parseExpression(parser, ctx, {
                                allowNullable: false,
                            }),
                        ),
                    );
                }
                // no value is present, so it is equivalent to x: x
                else {
                    elements.push(
                        new StructKeyValueExpressionPair(
                            parser.loc(),
                            name,
                            new ElementExpression(parser.loc(), name, []),
                        ),
                    );
                }
            }

            if (parser.is(",")) {
                parser.accept();
            } else {
                parser.reject();
                break;
            }
        }
        return elements;
    }

    @trackState()
    static parseStructConstruction(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
    ): Expression {
        let loc = parser.loc();
        parser.expect("{");
        let lexeme = parser.peek();
        if (lexeme.type === "...") {
            parser.reject();
            let elements = ParseMethods.parseStructElements(parser, ctx);
            parser.expect("}");
            return new NamedStructConstructionExpression(loc, elements);
        } else if (lexeme.type === "identifier") {
            let lexeme2 = parser.peek();
            if (lexeme2.type === ":") {
                parser.reject();
                let elements = ParseMethods.parseStructElements(parser, ctx);
                parser.expect("}");
                return new NamedStructConstructionExpression(loc, elements);
            } else {
                parser.reject();
            }
        } else {
            parser.reject();
        }

        let expressions = ParseMethods.parseExpressionList(parser, ctx, opts);
        parser.expect("}");
        return new UnnamedStructConstructionExpression(loc, expressions);
    }

    @trackState()
    static parseVariableDeclaration(
        parser: Parser,
        ctx: Context,
    ): DeclaredVariable[] {
        let loc = parser.loc();
        let isConst = false;
        let isLocal = false;
        let token = parser.peek();

        ParseMethods.setState({"step": ["modifiers"]});
        ParseMethods.setState({"expectedTokens": ["local", "const", "$identifier"]});

        // Loop to check for "local" and "const" in any order, but only once each
        while (token.type === "local" || token.type === "const") {
            if (token.type === "local") {
                if (isLocal) {
                    parser.customError("Duplicate 'local' modifier found", token.location);
                }
                if (!(ctx.getOwner() instanceof BasePackage) && !(ctx.getOwner() instanceof DeclaredNamespace)) {
                    parser.customError("Namespaces are only allowed in the global context", token.location);
                }
                isLocal = true;
                parser.accept();  // Consume the "local" token
            } else if (token.type === "const") {
                if (isConst) {
                    parser.customError("Duplicate 'const' modifier found", token.location);
                }
                isConst = true;
                parser.accept();  // Consume the "const" token
            }

            token = parser.peek(); // Get the next token for the next iteration
        }
        parser.reject();

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

            4. Tuple Deconstruction: Tuple deconstruction is only used to unpack values from @trackState()
    static returns, where functions return more than one value.
            ```
            fn f(x: u32) -> (u32, u32, u32) = (x+1, x+2, x+3)

            // unpacking 1st and 3rd @trackState()
    static return values
            let (a, _, c) = f(1)
            ```
        */

        if (token.type === "[") {
            let d = ParseMethods.parseArrayDeconstruction(parser, ctx, isConst);
            d.forEach((v) => {
                v.isFromArray = true;
                v.initGroupID = INTIALIZER_GROUP_ID;
            });
            INTIALIZER_GROUP_ID++;
            return d;
        }

        if (token.type === "{") {
            let d = ParseMethods.parseObjectDeconstruction(parser, ctx, isConst);
            d.forEach((v) => {
                v.isFromStruct = true;
                v.initGroupID = INTIALIZER_GROUP_ID;
            });
            INTIALIZER_GROUP_ID++;
            return d;
        }

        if (token.type === "(") {
            let d = ParseMethods.parseTupleDeconstruction(parser, ctx, isConst);
            d.forEach((v) => {
                v.isFromTuple = true;
                v.initGroupID = INTIALIZER_GROUP_ID;
            });
            INTIALIZER_GROUP_ID++;
            return d;
        }

        return ParseMethods.parseRegularVariableDeclaration(parser, ctx, isConst, isLocal);
    }
    @trackState()
    static parseTupleDeconstruction(
        parser: Parser,
        ctx: Context,
        isConst: boolean,
    ): DeclaredVariable[] {
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
            } else {
                parser.reject();
                break;
            }
        }
        parser.expect(")");

        parser.expect("=");
        tupleExpression = ParseMethods.parseExpression(parser, ctx, {
            allowNullable: false,
        });

        return elements
            .filter((e) => e !== null)
            .map((name, index) => {
                let tupleDeconstruction = new TupleDeconstructionExpression(
                    loc,
                    tupleExpression,
                    index,
                );

                let d = new DeclaredVariable(
                    loc,
                    name as string,
                    tupleDeconstruction,
                    null, // type will be inferred later
                    isConst,
                    false,
                    false
                );

                return d;
            });
    }

    @trackState()
    static parseObjectDeconstruction(
        parser: Parser,
        ctx: Context,
        isConst: boolean,
    ): DeclaredVariable[] {
        parser.expect("{");

        let elements: {
            variable: DeclaredVariable;
            isRemaining: boolean;
            field: string | null;
        }[] = [];
        let readFields: string[] = [];

        while (1) {
            let isRemaining = false;

            if (parser.is("...")) {
                isRemaining = true;
                parser.accept();
                let variableName = parser.expect("identifier").value;

                elements.push({
                    variable: new DeclaredVariable(
                        parser.loc(),
                        variableName,
                        new TrueLiteralExpression(parser.loc()),
                        null,
                        isConst,
                        false,
                        false
                    ),
                    field: null,
                    isRemaining: isRemaining,
                });

                break;
            } else {
                parser.reject();
                let propertyName = parser.expect("identifier").value;
                let variableName = propertyName;

                readFields.push(propertyName);

                if (parser.is(":")) {
                    variableName = parser.expect("identifier").value;
                } else {
                    parser.reject();
                }

                elements.push({
                    variable: new DeclaredVariable(
                        parser.loc(),
                        variableName,
                        new TrueLiteralExpression(parser.loc()),
                        null,
                        isConst,
                        false,
                        false
                    ),
                    field: propertyName,
                    isRemaining: isRemaining,
                });

                if (parser.is(",")) {
                    parser.accept();
                } else {
                    parser.reject();
                    break;
                }
            }
        }

        parser.expect("}");
        parser.expect("=");

        let initializer = ParseMethods.parseExpression(parser, ctx, {
            allowNullable: false,
        });

        let vars = elements.map((prop, i) => {
            prop.variable!.initializer = new StructDeconstructionExpression(
                prop.variable!.location,
                initializer,
                prop.isRemaining ? null : prop.field,
                prop.isRemaining ? readFields : null,
                prop.isRemaining,
            );

            return prop.variable;
        });

        return vars;
    }

    @trackState()
    static parseArrayDeconstruction(
        parser: Parser,
        ctx: Context,
        isConst: boolean,
    ): DeclaredVariable[] {
        parser.expect("[");
        let elements: {
            variable: DeclaredVariable | null;
            isRemaining: boolean;
            isIgnored: boolean;
        }[] = [];

        while (1) {
            let isRemaining = false;

            if (parser.peek().type == "_") {
                parser.accept();
                elements.push({
                    variable: null,
                    isIgnored: true,
                    isRemaining: false,
                });
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
                    variable: new DeclaredVariable(
                        parser.loc(),
                        name,
                        new TrueLiteralExpression(parser.loc()),
                        null,
                        isConst,
                        false,
                        false
                    ),
                    isIgnored: false,
                    isRemaining: isRemaining,
                });
            }

            if (parser.peek().type == ",") {
                if (isRemaining) {
                    parser.customError(
                        "Unexpected `,` in array deconstruction, after `...`",
                        parser.loc(),
                    );
                }
                parser.accept();
            } else {
                parser.reject();
                break;
            }
        }
        parser.expect("]");
        parser.expect("=");
        let initializer = ParseMethods.parseExpression(parser, ctx, {
            allowNullable: false,
        });

        return elements
            .filter((e) => !e.isIgnored)
            .map((e, index) => {
                if (e.variable) {
                    e.variable.initializer = new ArrayDeconstructionExpression(
                        e.variable.location,
                        initializer,
                        index,
                        e.isRemaining,
                    );
                    return e.variable;
                }
                throw new Error("Unexpected null variable in array deconstruction");
            });
    }

    @trackState()
    static parseRegularVariableDeclaration(
        parser: Parser,
        ctx: Context,
        isConst: boolean,
        isLocal: boolean
    ): DeclaredVariable[] {
        var loc = parser.loc();
        ParseMethods.setState({"step": ["name"]});
        var token = parser.expect("identifier");
        parser.accept();
        let name = token.value;
        let type: DataType | null = null;
        // let x: strict i32 = 1
        // let x: strict = someFunc()
        // let x = someFunc2()
        token = parser.peek();
        if (token.type === ":") {
            ParseMethods.setState({"step": ["type"]});
            parser.accept();
            type = ParseMethods.parseType(parser, ctx);
        } else {
            parser.reject();
        }

        parser.expect("=");
        ParseMethods.setState({"step": ["initializer"]});
        // TODO: make sure code gen doesn"t generate this expression multipe times for deconstructed variables
        let initializer = ParseMethods.parseExpression(parser, ctx, {
            allowNullable: false,
        });
        let v = new DeclaredVariable(loc, name, initializer, type, isConst, isLocal, false);
        return [v];
    }

    @trackState()
    static parseVariableDeclarationList(
        parser: Parser,
        ctx: Context,
    ): DeclaredVariable[] {
        let canLoop = true;
        let declarations: DeclaredVariable[] = [];
        while (canLoop) {
            let decls = ParseMethods.parseVariableDeclaration(parser, ctx);

            declarations.push(...decls);

            var token = parser.peek();
            canLoop = token.type === ",";
            if (canLoop) {
                parser.accept();
            } else {
                parser.reject();
            }
        }
        return declarations;
    }

    @trackState()
    static parseExpressionList(
        parser: Parser,
        ctx: Context,
        opts: ExpressionParseOptions,
        allowDestructuring: boolean = false,
    ): Expression[] {
        let canLoop = true;
        let expressions: Expression[] = [];
        while (canLoop) {
            if (allowDestructuring) {
                if (parser.is("...")) {
                    parser.accept();
                    let expr = ParseMethods.parseExpression(parser, ctx, opts);
                    expressions.push(
                        new ArrayUnpackingExpression(parser.loc(), expr),
                    );

                    let token = parser.peek();
                    canLoop = token.type === ",";
                    if (canLoop) {
                        parser.accept();
                        continue;
                    } else {
                        parser.reject();
                        break;
                    }
                } else {
                    parser.reject();
                }
            }
            let expr = ParseMethods.parseExpression(parser, ctx, opts);
            expressions.push(expr);
            let token = parser.peek();
            canLoop = token.type === ",";
            if (canLoop) {
                parser.accept();
            } else {
                parser.reject();
            }
        }
        return expressions;
    }

    @trackState()
    static parseMatchCases(
        parser: Parser,
        ctx: Context,
        form: "expr" | "stmt" = "expr",
    ): MatchCaseExpression[] {
        let cloc = parser.loc();
        let canLoop = true;
        let cases: MatchCaseExpression[] = [];
        ParseMethods.setState({"step": ["cases"]});
        while (canLoop) {
            let newScope = new Context(cloc, parser, ctx);
            newScope.location = parser.loc();
            let pattern = ParseMethods.parseMatchPattern(parser, newScope);
            let lexeme = parser.peek();
            let loc = parser.loc();
            let ifGuard: Expression | null = null;
            if (lexeme.type === "if") {
                ParseMethods.setState({"step": ["ifGuard"]});
                parser.accept();
                ifGuard = ParseMethods.parseExpression(parser, newScope, {
                    allowNullable: false,
                });
            } else {
                parser.reject();
            }

            if (form == "expr") {
                ParseMethods.setState({"step": ["match_expression"]});
                parser.expect("=>");
                let body = ParseMethods.parseExpression(parser, newScope, {
                    allowNullable: false,
                });
                cases.push(
                    new MatchCaseExpression(
                        loc,
                        newScope,
                        pattern,
                        "match_expression",
                        body,
                        null,
                        ifGuard,
                    ),
                );
            } else {
                ParseMethods.setState({"step": ["match_block"]});
                let body = ParseMethods.parseStatementBlock(parser, newScope);
                cases.push(
                    new MatchCaseExpression(
                        loc,
                        newScope,
                        pattern,
                        "match_block",
                        null,
                        body,
                        ifGuard,
                    ),
                );
            }

            if (form == "expr") {
                ParseMethods.setState({"step": ["match_cases"]});
                lexeme = parser.peek();
                if (lexeme.type === ",") {
                    parser.accept();
                } else {
                    parser.reject();
                    canLoop = false;
                }
            }

            // allow trailing comma
            lexeme = parser.peek();
            if (lexeme.type === "}") {
                canLoop = false;
            }
            parser.reject();
            newScope.endLocation = parser.loc();
        }
        return cases;
    }

    // parses a single pattern expression along side its body
    @trackState()
    static parseMatchPattern(
        parser: Parser,
        ctx: Context,
        parentType: "array" | "struct" | null = null,
    ): PatternExpression {
        let loc = parser.loc();
        let lexeme = parser.peek();
        if (lexeme.type === "[") {
            parser.accept();
            let elements = ParseMethods.parseMatchPatternList(parser, ctx);
            parser.expect("]");
            return new ArrayPatternExpression(loc, elements);
        }
        if (lexeme.type === "{") {
            parser.accept();
            let remaining: StructVariablePatternExpression | null = null;
            let fields = ParseMethods.parseMatchPatternStructFields(parser, ctx);
            let tok = parser.peek();
            if (tok.type !== "}") {
                parser.reject();
                parser.expect("...");
                let id = parser.expect("identifier");
                remaining = new StructVariablePatternExpression(
                    id.location,
                    id.value,
                );
            } else {
                parser.reject();
            }
            parser.expect("}");
            return new StructPatternExpression(loc, fields, remaining);
        } else if (lexeme.isLiteral()) {
            parser.accept();
            return new LiteralPatternExpression(loc, lexeme.toLiteral());
        } else if (lexeme.type === "_") {
            parser.accept();
            return new WildCardPatternExpression(loc);
    } else if (lexeme.type === "identifier") {
        const char = lexeme.value[0];

        let nextToken = parser.peek();
        // a type with a namespace, or just a type. A type either way!
        if(nextToken.type === "."){
            parser.reject();
            return ParseMethods.parseMatchPatternType(parser, ctx);
        }
        else {
            // reject the lookahead past the identifier
            parser.rejectOne();
            if (char == char.toUpperCase()) {
                parser.reject();
                return ParseMethods.parseMatchPatternType(parser, ctx);
            } else {
                parser.accept();
                return new VariablePatternExpression(loc, lexeme.value);
            }
        }
        
    } else if (lexeme.type === "...") {
            parser.accept();
            let variable = ParseMethods.parseMatchPattern(parser, ctx); //, parentType);
            if (!(variable instanceof VariablePatternExpression)) {
                parser.customError(
                    "Expected variable after token`...` in array pattern",
                    variable.location,
                );
            }

            if (parentType == "array") {
                let arrayVar = new ArrayVariablePatternExpression(
                    variable.location,
                    variable.name,
                );
                return arrayVar;
            }

            return variable;
        } else {
            // assume data type
            parser.reject();
            return ParseMethods.parseMatchPatternType(parser, ctx);
        }

        parser.reject();
        parser.assert(false, "Invalid symbol in pattern expression");
        // @ts-ignore
        return null;
    }

    @trackState()
    static parseMatchPatternType(
        parser: Parser,
        ctx: Context,
    ): PatternExpression {
        let loc = parser.loc();
        let dataType = ParseMethods.parseType(parser, ctx);
        let lexeme = parser.peek();
        if (lexeme.type === "(") {
            parser.accept();
            lexeme = parser.peek();
            if (lexeme.type === ")") {
                parser.accept();
                return new DataTypePatternExpression(loc, dataType, []);
            }
            parser.reject();
            let args = ParseMethods.parseMatchPatternList(parser, ctx);
            parser.expect(")");
            return new DataTypePatternExpression(loc, dataType, args);
        } else {
            parser.reject();
            return new DataTypePatternExpression(loc, dataType, []);
        }
    }

    @trackState()
    static parseMatchPatternList(
        parser: Parser,
        ctx: Context,
    ): PatternExpression[] {
        let canLoop = true;
        let expressions: PatternExpression[] = [];
        while (canLoop) {
            let expr = ParseMethods.parseMatchPattern(parser, ctx, "array");

            expressions.push(expr);
            let token = parser.peek();
            canLoop = token.type === ",";
            if (canLoop) {
                if (expr instanceof ArrayVariablePatternExpression) {
                    parser.customError(
                        "Expected end of array pattern after array variable pattern `...`",
                        token.location,
                    );
                }
                parser.accept();
            } else {
                parser.reject();
            }
        }
        return expressions;
    }

    @trackState()
    static parseMatchPatternStructFields(
        parser: Parser,
        ctx: Context,
    ): StructFieldPattern[] {
        let canLoop = true;
        let fields: StructFieldPattern[] = [];
        while (canLoop) {
            let tok = parser.peek();
            if (tok.type === "identifier") {
                parser.accept();
                parser.expect(":");
                let pattern = ParseMethods.parseMatchPattern(parser, ctx, "struct");
                fields.push({ name: tok.value, pattern: pattern });
                let token = parser.peek();
                canLoop = token.type === ",";
                if (canLoop) {
                    parser.accept();
                } else {
                    parser.reject();
                }
            } else {
                parser.reject();
                canLoop = false;
            }
        }
        return fields;
    }

    /**
     * Statements
     */

    @trackState()
    static parseStatement(parser: Parser, ctx: Context): Statement {
        let lexeme = parser.peek();
        parser.reject();

        switch (lexeme.type) {
            case "let":
                return ParseMethods.parseStatementLet(parser, ctx);
            case "return":
                return ParseMethods.parseStatementReturn(parser, ctx);
            case "break":
                return ParseMethods.parseStatementBreak(parser, ctx);
            case "continue":
                return ParseMethods.parseStatementContinue(parser, ctx);
            case "if":
                return ParseMethods.parseStatementIf(parser, ctx);
            case "while":
                return ParseMethods.parseStatementWhile(parser, ctx);
            case "do":
                return ParseMethods.parseStatementRepeat(parser, ctx);
            case "for":
                return ParseMethods.parseStatementFor(parser, ctx);
            case "foreach":
                return ParseMethods.parseStatementForEach(parser, ctx);
            case "match":
                return ParseMethods.parseStatementMatch(parser, ctx);
            case "fn":
            case "cfn":
                return ParseMethods.parseStatementFn(parser, ctx);
            case "{":
                return ParseMethods.parseStatementBlock(parser, ctx);
            default:
                return ParseMethods.parseStatementExpression(parser, ctx);
        }
    }

    @trackState()
    static parseStatementLet(
        parser: Parser,
        ctx: Context,
    ): VariableDeclarationStatement {
        let loc = parser.loc();
        parser.expect("let");
        let variables = ParseMethods.parseVariableDeclarationList(parser, ctx);

        return new VariableDeclarationStatement(loc, variables);
    }

    @trackState()
    static parseStatementReturn(parser: Parser, ctx: Context): Statement {
        let loc = parser.loc();
        parser.expect("return");
        parser.assert(
            ctx.env.withinFunction || ctx.env.withinDoExpression,
            "Cannot return outside of function",
        );
        let expression = ParseMethods.parseExpression(parser, ctx, {
            allowNullable: true,
        });

        if (ctx.env.withinDoExpression) {
            parser.assert(
                expression != null,
                "Cannot return void from a do-expression, must always return an expression",
            );
        }

        let ret = new ReturnStatement(loc, expression);
        if (ctx.env.withinDoExpression) {
            ctx.findParentDoExpression()!.returnStatements.push({ stmt: ret, ctx });
        } else {
            ctx.findParentFunction()?.returnStatements.push({ stmt: ret, ctx });
        }

        return ret;
    }

    @trackState()
    static parseStatementBreak(parser: Parser, ctx: Context): BreakStatement {
        let loc = parser.loc();
        parser.expect("break");
        parser.assert(ctx.env.withinLoop, "Cannot break outside of loop");

        return new BreakStatement(loc);
    }

    @trackState()
    static parseStatementContinue(
        parser: Parser,
        ctx: Context,
    ): ContinueStatement {
        let loc = parser.loc();
        parser.expect("continue");
        parser.assert(ctx.env.withinLoop, "Cannot continue outside of a loop");

        return new ContinueStatement(loc);
    }

    @trackState()
    static parseStatementIf(parser: Parser, ctx: Context): IfStatement {
        let loc = parser.loc();
        parser.expect("if");
        let ifBlocks: { expression: Expression; statement: BlockStatement }[] = [];
        let elseExpr: BlockStatement | null = null;

        let loop = true;
        while (loop) {
            let expr = ParseMethods.parseExpression(parser, ctx, {
                allowNullable: true,
            });
            let stmt = ParseMethods.parseStatementBlock(parser, ctx);
            ifBlocks.push({ expression: expr, statement: stmt });
            let lexeme = parser.peek();

            if (lexeme.type === "else") {
                parser.accept();
                lexeme = parser.peek();
                if (lexeme.type === "if") {
                    parser.accept();
                } else {
                    parser.reject();
                    loop = false;
                    elseExpr = ParseMethods.parseStatementBlock(parser, ctx);
                }
            } else {
                parser.reject();
                loop = false;
            }
        }
        return new IfStatement(loc, ifBlocks, elseExpr);
    }

    @trackState()
    static parseStatementWhile(parser: Parser, ctx: Context): WhileStatement {
        let loc = parser.loc();
        parser.expect("while");
        let expression = ParseMethods.parseExpression(parser, ctx, {
            allowNullable: true,
        });
        let statement = ParseMethods.parseStatementBlock(parser, ctx, true);
        // mark the statement block as a loop context
        statement.context.env.loopContext = true;
        return new WhileStatement(loc, expression, statement);
    }

    @trackState()
    static parseStatementRepeat(parser: Parser, ctx: Context): DoWhileStatement {
        let loc = parser.loc();
        parser.expect("repeat");
        let statement = ParseMethods.parseStatementBlock(parser, ctx, true);
        // mark the statement block as a loop context
        statement.context.env.loopContext = true;
        parser.expect("while");
        let expression = ParseMethods.parseExpression(parser, ctx, {
            allowNullable: true,
        });

        return new DoWhileStatement(loc, expression, statement);
    }

    @trackState()
    static parseStatementFor(parser: Parser, ctx: Context): ForStatement {
        let loc = parser.loc();
        parser.expect("for");

        let token = parser.peek();
        let initializers: Statement[] = [];
        let newScope = new Context(loc, parser, ctx);
        newScope.location = loc;

        if (token.type === ";") {
            parser.accept();
        } else {
            parser.reject();
            initializers = ParseMethods.parseStatementList(parser, newScope);
            parser.expect(";");
        }

        token = parser.peek();
        let condition: Expression | null = null;
        if (token.type === ";") {
            parser.accept();
        } else {
            parser.reject();
            condition = ParseMethods.parseExpression(parser, newScope, {
                allowNullable: true,
            });
            parser.expect(";");
        }

        let incrementors: Expression[] = [];

        token = parser.peek();
        if (token.type !== "{") {
            parser.reject();
            incrementors = ParseMethods.parseExpressionList(parser, newScope, {
                allowNullable: true,
            });
        } else {
            parser.reject();
        }

        let body = ParseMethods.parseStatementBlock(parser, newScope, true);
        newScope.endLocation = parser.loc();
        // mark the statement block as a loop context
        return new ForStatement(
            loc,
            newScope,
            initializers,
            condition,
            incrementors,
            body,
        );
    }

    @trackState()
    static parseStatementForEach(parser: Parser, ctx: Context): ForeachStatement {
        let loc = parser.loc();
        parser.expect("foreach");

        let useConst = false;
        let token = parser.peek();
        if(token.type === "const"){
            parser.accept();
            useConst = true;
        }
        else {
            parser.reject();
        }
        
        let newScope = new Context(loc, parser, ctx);
        newScope.location = loc;

        token = parser.expect("identifier");
        
        let valueName: string | null = null;
        let indexName: string | null = null;

        valueName = token.value;

        token = parser.peek();
        if(token.type === ","){
            parser.accept();
            indexName = valueName;
            valueName = parser.expect("identifier").value;
        }
        else {
            parser.reject();
        }

        parser.expect("in");
        let expression = ParseMethods.parseExpression(parser, newScope, {
            allowNullable: false,
        });
        let body = ParseMethods.parseStatementBlock(parser, newScope, true);
        
        return new ForeachStatement(loc, newScope, useConst, valueName, indexName, expression, body);
    }

    @trackState()
    static parseStatementMatch(parser: Parser, ctx: Context): MatchStatement {
        let loc = parser.loc();
        parser.expect("match");
        parser.accept();
        let expression = ParseMethods.parseExpression(parser, ctx, {
            allowNullable: false,
        });
        parser.expect("{");
        let cases: MatchCaseExpression[] = ParseMethods.parseMatchCases(parser, ctx, "stmt");
        // make sure we have at least one case
        if (cases.length == 0) {
            parser.customError("Match expression must have at least one case", loc);
        }
        parser.expect("}");
        return new MatchStatement(loc, expression, cases);
    }

    /**
     *
     * @param parser
     * @param ctx
     * @param isLoop flag, set to true if this @trackState()
    static is called from a loop without ctx
     * @returns
     */
    @trackState()
    static parseStatementBlock(
        parser: Parser,
        ctx: Context,
        isLoop: boolean = false,
    ): BlockStatement {
        let loc = parser.loc();
        parser.expect("{");
        let newScope = new Context(loc, parser, ctx, { withinLoop: isLoop });
        newScope.location = loc;
        let statements: Statement[] = [];
        let tok = parser.peek();
        parser.reject();
        let canLoop = tok.type !== "}";
        while (canLoop) {
            let statement = ParseMethods.parseStatement(parser, newScope);
            statements.push(statement);
            let token = parser.peek();
            canLoop = token.type !== "}";
            parser.reject();
        }
        newScope.endLocation = parser.loc();

        parser.expect("}");
        return new BlockStatement(loc, newScope, statements);
    }

    @trackState()
    static parseStatementExpression(
        parser: Parser,
        ctx: Context,
    ): ExpressionStatement {
        let loc = parser.loc();
        let lexeme = parser.peek();
        parser.reject();
        let expression = ParseMethods.parseExpression(parser, ctx, {
            allowNullable: false,
        });
        if (expression == null) {
            parser.error("Invalid expression", loc, lexeme.value.length);
            // move the lexer forward to the next token to not get stuck in an infinite loop in intellisense
            parser.lexer.skipToNextLine();
            console.log("Skipped");
            parser.accept();
            return new ExpressionStatement(loc, new UnreachableExpression(loc));
        }
        return new ExpressionStatement(loc, expression);
    }

    @trackState()
    static parseStatementFn(
        parser: Parser,
        ctx: Context,
    ): FunctionDeclarationStatement {
        let loc = parser.loc();
        let proto = ParseMethods.parseFunctionPrototype(parser, ctx);

        let lexeme = parser.peek();

        let newScope = new Context(loc, parser, ctx, { withinFunction: true });
        newScope.location = loc;

        let fn = new DeclaredFunction(loc, newScope, proto, null, null);
        newScope.setOwner(fn);

        let exprBody: Expression | null = null;
        let stmtBody: BlockStatement | null = null;

        if (lexeme.type === "{") {
            parser.reject();
            stmtBody = ParseMethods.parseStatementBlock(parser, newScope);
        } else {
            parser.reject();
            parser.expect("=");
            exprBody = ParseMethods.parseExpression(parser, newScope, {
                allowNullable: false,
            });
        }

        fn.body = stmtBody;
        fn.expression = exprBody;

        if (fn.isCoroutineCallable) {
            proto.header.isCoroutine = true;
        }

        parser.assert(
            exprBody !== null || stmtBody !== null,
            "Function body is not defined!",
        );

        let fnStatement = new FunctionDeclarationStatement(loc, fn);
        fn.declStatement = fnStatement;
        ctx.addSymbol(fn);
        newScope.endLocation = parser.loc();

        //ctx.overrideSymbol(proto.name, fn.astNode);
        return fnStatement;
    }

    @trackState()
    static parseStatementList(parser: Parser, ctx: Context): Statement[] {
        let canLoop = true;
        let statements: Statement[] = [];
        while (canLoop) {
            let stmt = ParseMethods.parseStatement(parser, ctx);
            statements.push(stmt);
            let token = parser.peek();
            canLoop = token.type === ",";
            if (canLoop) {
                parser.accept();
            } else {
                parser.reject();
            }
        }
        return statements;
    }
}