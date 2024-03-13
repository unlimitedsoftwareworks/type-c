# Internal Checklist

- 13/04/2024@18:20: 
    - Infer functions for some expressions
    - Finding common types for multiple datatypes `typeinference.ts:findCompatibleTypes`
    - Casting generic types to specific types, such as getting an interface from a reference or an interface from a join types, using `DataType.is(InterfaceType)`, and `DataType.to(InterfaceType)`, these functions are implemented internally to return and perform the appropriate casting.
    - Basic implementation of cloning for declared functions, etc.

- 13/04/2024@TODO:
    - Inference of IndexAccessExpression
    - Inference of IndexSetExpression