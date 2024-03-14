# Internal Checklist

- 13/03/2024@18:20: 
    - Finding common types for multiple datatypes `typeinference.ts:findCompatibleTypes`
    - Casting generic types to specific types, such as getting an interface from a reference or an interface from a join types, using `DataType.is(InterfaceType)`, and `DataType.to(InterfaceType)`, these functions are implemented internally to return and perform the appropriate casting.
    - Basic implementation of cloning for declared functions, etc.

- 13/03/2024:
    - Infer functions for some expressions
    - MetaTypes (also known as RawTypes in the old compiler), which holds enums, classes, interfaces, variants and variant consturctors
    - New method `allowNullable`, which indicates that a datatype is allowed to be wrapped within a `Nullable` class. For example Classes, interfaces, struct, variants can be nullables.
    - New method `Expression.checkHint` used to compare the hint with the inferred type of the expression, since the check is very repetitive.

- 14/03/2024:
    - Removed auto returning `inferredType` when set, from within expression, when we re-infer function return expression, the hint is not set and type checks are not performed since it auto-returns first thing during inference.
    One solution is to not infer return statements expressions, gotta investigate! 


TODOs:
- Allow class attributes (both static and not static) to be immutable, and can only be set from within the constructor.
- Address the issue of non-inferred expressions suchas expressions as arguments to method call.

    ```ts
    dt.callMe({"user", 20})
    ```
    In such case, the compiler will not infer the unnamed struct construction `{"user", 20}` with the method argument, due to method overload resolution.
- Match Statements
- Processes