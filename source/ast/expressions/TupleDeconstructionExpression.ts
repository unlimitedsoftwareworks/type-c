import { Expression } from "./Expression";
import { SymbolLocation } from "../symbol/SymbolLocation";
import { DataType } from "../types/DataType";
import { Context } from "../symbol/Context";
import { TupleType } from "../types/TupleType";
import { IntLiteralExpression } from "./LiteralExpression";

export class TupleDeconstructionExpression extends Expression {
    constructor(
        location: SymbolLocation,
        public tupleExpression: Expression,
        public index: IntLiteralExpression
    ) {
        super(location, "tuple_deconstruction");
    }

    infer(ctx: Context, hint: DataType | null): DataType {
        this.setHint(hint);

        let tupleType = this.tupleExpression.infer(ctx, null);

        if (!tupleType.is(ctx, TupleType)) {
            throw ctx.parser.customError(`Expected tuple type, got ${tupleType.shortname()}`, this.location);
        }

        let tuple = tupleType.to(ctx, TupleType) as TupleType;
        let indexValue = parseInt(this.index.value);

        if (indexValue < 0 || indexValue >= tuple.types.length) {
            throw ctx.parser.customError(`Tuple index out of bounds: ${indexValue}`, this.location);
        }

        this.inferredType = tuple.types[indexValue];
        this.checkHint(ctx);
        return this.inferredType;
    }

    clone(typeMap: { [key: string]: DataType; }, ctx: Context): TupleDeconstructionExpression {
        return new TupleDeconstructionExpression(
            this.location,
            this.tupleExpression.clone(typeMap, ctx),
            this.index.clone(typeMap, ctx) as IntLiteralExpression
        );
    }
}
