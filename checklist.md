# Internal Checklist

## Note:
This checklist containts only major changes and updates, for minor changes and updates, please refer to the commit history.

- 13/03/2024: 
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

- 17/03/2024: 
    - `Context.addSymbol` now sets the `parentContext` of the symbol added, if a symbol is imported, `Context.addExternalSymbol` is used instead, which does not set the `parentContext` of the symbol added.
    - `ReferenceType` now requires attribute `usageContext`, which points the context in which the reference is used, and Not where the reference is declared!
    - Since generic class methods do not support overloading, the method `ClassType.getGenericMethodByName(name: string)` has been introduced and used in `FunctionCallExpression` to get the generic method to be called.
    
- 18/03/2024:
    - Variant constructors are matched based not only on name and argument but at their position within the parent.

- 20/03/2024:
    - Added `getGenericParameters(ctx: Context, originalType: DataType, declaredGenerics: {[key: string]: GenericType}):  {[key: string]: DataType} ` which returns the list of generic types with a compound type, this is used within `ClassType.getMethodBySignature` to create concrete method from generic method and a given signature. It makes sure that redudant generic usages are consistent and throws error on failure
    
- 28/03/2024:
    - Removed processes concept from the language.
    - Added `locks` and `promises` as builtin types.
    - Class checking is now based on location, until a better solution comes up
    - `getMethodBySignature` now also takes type arguments, so it can infer generics when not present, or just clone the methods when they are present.

- 04/03/2024:
    - Context has `uuid` and it assigns a `uid` to all symbols it owns.
    - `ClassMethod`, `LambdaExpression` and `DeclaredFunction` now have an attribute `codeGenProps: FunctionCodegenProps`, which contains all symbols (locals, arguments and upvalues) of that function to be used for code gen. This field is filled when the `Element` (terminal expression) is being resolved through `lookupScope`, and this new class `FunctionCodegenProps` is used to report unused arguments in the function.
    - Added a field `wasInferred` to `DeclaredFunction` instances to avoid inferring **non-generic** function declaration multiple times.

- 04/04/2024:
    - During `FunctionCallExpression` inference, if the LHS is an element, the arguments are inferred as `null` hint and the field `inferredArgumentsTypes: DataType[] | undefined = undefined` is set for the element. If the element is a generic function call, and has no type arguments, generics are extracted from the `inferredArgumentsTypes` field (similar to class methods).
    - ~~ (old) Fix cloning of variable declarations and function declarations, also cloning scopes doesn't copy the symbols anymore. It only copies variables and functions since these are static and already set by the parser.~~
    - `inferredArgumentsTypes` is only set in `FunctionCallExpression` only when lhs is an element and has no generic parameters. Next is to only set it if the LHS is generic and has no type arguments.
    - Now we infer the arguments of generics only if the function being called is generic and has no type arguments, otherwise we use the type arguments provided.
    - Lambda expressions now have a symbol attached to them to be registered in global context

- 13/04/2024:
    - Originally, variables and functions are added to their parent context during parsing. This behavior has been changed, they are now added to the context when their respective declaration statement is being resolved. This makes context cloning simpler, since we init the cloned context with empty symbols, the symbols will be added when the declaration is resolved when resolving the parenting cloned statement/expr.

## TODOs:
- Allow class attributes (both static and not static) to be immutable, and can only be set from within the constructor.
- Address the issue of non-inferred expressions suchas expressions as arguments to method call.

    ```ts
    dt.callMe({"user", 20})
    ```
    In such case, the compiler will not infer the unnamed struct construction `{"user", 20}` with the method argument, due to method overload resolution.


## Roadmap:

- [x] Implement Nullish coalescing operator as a binary operator, will require additional parameter to `expresion.infer` so when we encounter nullable member access we can accept it knowing that there is a fallback value: `a?.b ?? 0`.
- [ ] Add Short-circuiting logical operators and nullish coalescing operator (codegen)
- [ ] Add language level support for threads
- [x] Infer generic method call without exilicitly specifying the generic types (from within `FunctionCallExpression`)
- [ ] ~~Add support Shadow Classes (requires VM integration too)~~
- [ ] Bytecode generation


## Cases to evaluate:
### Case 1: Casting with hint
```tc
let l1: lock<u32> = new lock(0)

fn f1() -> i32 {
    let z: i32 = 1

    return z
}

let thread1 = spawn f1()
let x: u64 = (await thread1) as u32
```
results in: 
```
tests/test18/test.tc:17:30:Cannot cast u32 to u64: Type mismatch, expected u32, got u64
let x: u64 = (await thread1) as u32
```
-> Casting with target u32 and a hint of u64.

### Case 2: Mutable basic types
```tc
fn changeme(mut x: u32){ 
    x = 1
}

let y: u32 = 0
changeme(y) // doesn't work! compiler needs to get the value back and update
```