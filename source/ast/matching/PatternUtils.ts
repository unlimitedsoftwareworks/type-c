import { BinaryExpression } from "../expressions/BinaryExpression";
import { ElementExpression } from "../expressions/ElementExpression";
import { Expression } from "../expressions/Expression";
import { FunctionCallExpression } from "../expressions/FunctionCallExpression";
import { IntLiteralExpression, StringLiteralExpression } from "../expressions/LiteralExpression";
import { MemberAccessExpression } from "../expressions/MemberAccessExpression";
import { KeyValueExpressionPair, NamedStructConstructionExpression } from "../expressions/NamedStructConstructionExpression";
import { Context } from "../symbol/Context";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { StructType } from "../types/StructType";
import { ArrayVariablePatternExpression } from "./ArrayVariablePatternExpression";
import { LiteralPatternExpression } from "./LiteralPatternExpression";
import { PatternExpression } from "./PatternExpression";
import { StructVariablePatternExpression } from "./StructVariablePatternExpression";
import { VariablePatternExpression } from "./VariablePatternExpression";
import { WildCardPatternExpression } from "./WildCardPatternExpression";

export type PatternToExpression = {
    condition: Expression | null,
    variableAssignments: Expression[]
}

export function buildLengthCheckExpression(location: SymbolLocation, baseExpression: Expression, minOrExactLength: "min" | "exact", length: number): Expression {
    return new BinaryExpression(
        location, 
        new MemberAccessExpression(
            location, 
            baseExpression, 
            new ElementExpression(location, "length")
        ), 
        IntLiteralExpression.makeLiteral(location, length, "u64"),
        minOrExactLength === "min" ? ">=" : "=="
    );
}

export function buildVariableAssignment(location: SymbolLocation, baseExpression: Expression, pattern: VariablePatternExpression): Expression {
    return new BinaryExpression(
        location, 
        new ElementExpression(location, pattern.name), 
        baseExpression,
        "="
    );
}

export function checkSubPattern(ctx: Context, base: Expression, pattern: PatternExpression): PatternToExpression {
    // if it is a regular variable pattern, we can just check if the base expression is assignable to the pattern
    if (pattern instanceof VariablePatternExpression) {
        let rhs = base;
        let variable = buildVariableAssignment(pattern.location, rhs, pattern);
        variable.infer(ctx);
        return {condition: null, variableAssignments: [variable]};
    }
    else if (pattern instanceof ArrayVariablePatternExpression) {
        // we generate as follows: base.slice(<pos>, <length>) 
        let pos = pattern.position;
        let lengthExpr = new MemberAccessExpression(pattern.location, base, new ElementExpression(pattern.location, "length"));
        let posExpr = IntLiteralExpression.makeLiteral(pattern.location, pos, "u64");
        
        let slice = new MemberAccessExpression(pattern.location, base, new ElementExpression(pattern.location, "slice"));
        let callExpr = new FunctionCallExpression(pattern.location, slice, [posExpr, lengthExpr]);

        let variableExpr = new ElementExpression(pattern.location, pattern.name);
        let assignment = new BinaryExpression(pattern.location, variableExpr, callExpr, "=");
        assignment.infer(ctx);
        return {condition: null, variableAssignments: [assignment]};
    }
    else if (pattern instanceof StructVariablePatternExpression) {
        // we fill out the struct with the base expression
        // base is a struct, we need to check which fields matched

        // infer the base since we need the type
        // currently the expression is not inferred, as long as we are here
        base.infer(ctx);

        let structPattern = pattern.parent;
        let structType = base.inferredType?.to(ctx, StructType) as StructType;
        let allfields = structType.fields.map(e=> e.name);
        let extractedFields = structPattern!.capturedFields.map(e=> e.name);

        let remainingFields = allfields.filter(e => !extractedFields.includes(e));

        let fieldAssignments: KeyValueExpressionPair[] = remainingFields.map(e => ({
            name: e,
            value: new MemberAccessExpression(pattern.location, base, new ElementExpression(pattern.location, e)),
            location: pattern.location
        }));

        // now we constract the remaining fields
        let remainingStruct = new NamedStructConstructionExpression(pattern.location, fieldAssignments);
        let assignment = new BinaryExpression(pattern.location, new ElementExpression(pattern.location, pattern.name), remainingStruct, "=");
        assignment.infer(ctx);
        return {condition: null, variableAssignments: [assignment]};
    }
    else if(pattern instanceof WildCardPatternExpression){
        return {condition: null, variableAssignments: []};
    }
    else if (pattern instanceof LiteralPatternExpression) {
        // if string we use the built-in eq method
        if(pattern.literal instanceof StringLiteralExpression){
            // instead of == we perforn base.eq(pattern.literal)
            let member = new MemberAccessExpression(pattern.location, base, new ElementExpression(pattern.location, "eq"));
            let fn = new FunctionCallExpression(pattern.location, member, [pattern.literal as StringLiteralExpression]);
            return {condition: fn, variableAssignments: []};
        }


        // otherwise generate the expression for the pattern
        let patternResult = pattern.generateExpression(ctx, base);
        // return ==
        return {
            condition: new BinaryExpression(pattern.location, base, patternResult.condition!, "=="), 
            variableAssignments: patternResult.variableAssignments
        };
    }

    return pattern.generateExpression(ctx, base);

}

