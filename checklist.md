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

- 29/07/2024:
    - Added Tuple data type.

- 5/08/2024:
    - Added destructuring assignment for tuples, structs and arrays.
- 6/08/2024:
    - Added `external` attribute to symbols, to mark if a symbol is external or not. Was a bug that resulted in external symbols added to the global context and having their IR generated twice (one from original and one from context that imported it).
    - Added `getAllMethods` and `buildAllMethods` to `ClassType` to build all methods for a class, including the implemenation of all generic methods static and not.

- 8/08/2024:
    - Added `DoExpression`

- 10/08/2024:
    - Refactored bytecode for structs, a global id for every field is generated, covering all combinations, this global id is used to access the field in the struct, using an additional offset byte.
    - Refactored bytecode for classes and interfaces. VM now only supports classes. Class methods are processed the same way as structs now, each method has a global id.
    - class to interface now is direct, interface to interface is now done through new `i_has_m` bytecode instruction, which checks if the class has the method.

- 12/08/2024:
    - Isolated static methods, so static methods are stored in the base class type, not classes that are *concrete* implementations of that class. 
    - Static methods now support generics.

- 13/08/2024:
    - This is a reminder for me to differentiate between anonymous types and named types! this needs to be modeled properly, to generate proper errors and 
    start working on types layouts in the bytecode.

- 17/08/2024:
    - This expression now added recusively upwards, as an upvalue (obviously not added to the method itself, but any function/lambda within the class method)
    - Any anonymous function now is treated as a closure, and is generated as a closure.
    - Closures are finally here!

- 22/08/2024:
    - Implemented coroutine functions, to declare coroutine functions that be instatiated into coroutine objects. Coroutine functions are same as regular functions, but are not called directly, because they must yield values back to the caller. They are declared with `fn` or `cfn` keyword, but from a compiler perspective they are of type `cfn`.
    - Coroutine Callable Functions now ends with `throw_rt` instruction, which is used to throw an error when coroutine reaches end of execution and has not yielded any value.

- 8/11/2024:
    - Updated class, struct and array instructions to include bitmask for which fields are pointers.

- 10/11/2024:
    - Fixed a flaw with pointer bitmaps. Pointer fields in structs and classes are now specified when registering the field.
    - Changed instructions again, we do not create pointer bitmask on creating object but on every *_reg_field. Array still unchanged (ptr flag given in a_alloc).

- 16/11/2024:
    - Fixed const/mut analysis
    - Added `mutate` expression, which is used to mutate a variable.

- 23/11/2024:
    - Added namespaces, local symbols and namespace imports
    - Namespaces variables are pushed in the base package, and generated in the bytecode same as global variables.

- 24/11/2024:
    - Added `impl` datatype, for reusability and more modular behavior of classes.

- 25/11/2024:
    - Fixed issues with static variables/methods and blocks
    - Static variables are stored and read as global variables, also pushed in the base package global context.
    - Static block are now properly generated just like global block. They are also pushed in the base package global context.
    - Small fixes for class methods and attributes in the bytecode generator when nested under namespaces and invalid access of non-static method through the class name (instead of through an instance).
    - Added special assignment for `ThisExpression` in the form of `ThisDistributedAssignExpression`, which allows for distributed assignment to the attributes of `this`, such as `this += {x, y, z}` or `this += {a: x, b: y, c: z}`. Only works with `this`. Does not translate to creating a new struct, it extract field names and values from the RHS and translates it to a series of assignments.
    - Added special __index_rset__ which sets the value of an index of an array-like object, but in reverse order of __index_get__, such as `x[-3]`, Evaluates to `__index_rset__(x, 3, value)`. This is important because value is not evaluated as a negative number, the negative sign within an index `[]` translates to a reverse index access.
    - Added `override` keyword to class methods, to indicate that the method is overriding an external method with the same signature.

- 04/12/2024:
    - Eytzinger layout for structs and variants and class methods
    - Variants now have a $tag field which is always UID 0 and variant field UIDs share same pool as struct fields.

- 07/12/2024:
    - Reverted back to binary search, after some benchmarking

- 13/12/2024:
    - Added `foreach` statement, which iterates over an array or a struct.
    - Added `Context.InferenceMode` which refers to the mode of the compiler, whether it is in inference mode or code generation mode.
      In `codegen` mode, some errors are skipped because the codegen will refactor the AST and might endup revisiting some var decls etc. 

- 17/01/2025:
    - Added hideSymbol and unhideSymbol within VariableDeclaration.infer to avoid referencing a variable in its initializer
    - Foreach statement now infers the iterator class method if is not implemented
- 25/01/2025:
    - Each data type now has a unique ID called `weakId`, which is used to avoid infinit loop, previously `hash` method was used for the same purpose,
      but it required the type to be resolved. And resolving a type pushes its hash to stack -> fail.
      `hash` is now exclusively used where the exact type hashing is needed, otherwise weakId and `getWeakHash` (a string version of weak id) are to be used

- 26/01/2025:
    - Added partial structs
    - Nullish coalescing op now conditionally compares the result against null to decided if it will evaluate the RHS or not (i.e only for objects!):
        Now it also has a jump (to the RHS side), based on the last seen nullish coasl. op. If a member access yields null, it will jump to that.
        If it doesn't jump, it will instead jump to an end label (after the lhs has been evaluated). Partial structs use this behavior to jump to the 
        rhs if the struct doesn't contain a field. This kinda double dips for `nullableObj?.partial_struct.f ?? 10`, will jump if the obj is null or f 
        doesn't exist.
    - Added `ASTCheckers`, all AST checking will need to move there, so this is a work in progress and/or needs massive cleanup and review.
    - Every expression now properly propagates `meta` argument to properly handle nullish coalescing and partial field access
    - Implemented struct merge: `>>` and `<<` 



## TODOs:
- Allow class attributes (both static and not static) to be immutable, and can only be set from within the constructor.
- Address the issue of non-inferred expressions suchas expressions as arguments to method call.

    ```ts
    dt.callMe({"user", 20})
    ```
    In such case, the compiler will not infer the unnamed struct construction `{"user", 20}` with the method argument, due to method overload resolution.



## Roadmap:

- [x] Pad constants segment 
- [x] Pad global segment for faster access
- [x] Add Short-circuiting logical operators and nullish coalescing operator (codegen)
- [x] Implement Nullish coalescing operator as a binary operator, will require additional parameter to `expresion.infer` so when we encounter nullable member access we can accept it knowing that there is a fallback value: `a?.b ?? 0`.
- [ ] ~~Add language level support for threads~~
- [ ] ~~Add support Shadow Classes (requires VM integration too)~~
- [x] Infer generic method call without exilicitly specifying the generic types (from within `FunctionCallExpression`)
- [x] Bytecode generation
- [x] Pad structs in the VM, for faster CPU access

## Cases to evaluate:

### Pattern matching over custom types:
bytecode generation for pattern matching uses primitive types such as array slicing in case
`[x, y, ...rest]`

Inorder to allow matching over custom types, we need to add custom overloads for pattern matching,
for instance for array matching we need the index access override and a custom slice implementation.

Maybe even a built-in range class? like python x[0:3] -> x[Range(0, 3)] by overloading the index access operator.

Lots of potential work here, but also low priority.

### Improve performance, by a lot!
if we can create "templates" for types, we can then use local index instead of global offset for structs, interfaces and classes.
Hence we can avoid searching for index within the globalIndex table.

For each **defined** type, we add it to the template segment, each object will then be created 
based on that template (it has predefined index for its fields), and we can then use that index.
Each struct/class/interface/variant will need to have an ID referencing the template ID used to create it.

When generating bytecode, we will need instruction to fetch data from local index instead of global index.
