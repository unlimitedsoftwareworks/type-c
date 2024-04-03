
import { DataType } from "../ast/types/DataType";
import { EnumType } from "../ast/types/EnumType";
import { ReferenceType } from "../ast/types/ReferenceType";

/**
 * Returns the required byte size for a given data type
 * either 1, 2, 4 or 8.
 * 
 * @param type 
 */
export function getDataTypeByteSize(type: DataType): number {
    switch(type.kind) {
        case "array":
        case "struct":
        case "interface":
        case "class":
        case "variant":
        case "variant_constructor":
        case "promise":
        case "lock":
        case "fn":
        case "join":
        case "union":

        case "u64":
        case "i64":
        case "f64":
        case "nullable":
        case "null":
        case "ffi_method": // not really used
        case "ffi_namespace_type": // not really used
            return 8;


        case "u8":
        case "i8":
        case "bool":
            return 1;

        case "u16":
        case "i16":
            return 2;

        case "u32":
        case "i32":
        case "f32":
            return 4;
        
        case "enum": {
            let enumType = type as EnumType;

            if(enumType.as === "u8" || enumType.as === "i8") {
                return 1;
            }
            if(enumType.as === "u16" || enumType.as === "i16") {
                return 2;
            }
            if(enumType.as === "u32" || enumType.as === "i32" || enumType.as === "unset") {
                return 4;
            }
            if(enumType.as === "u64" || enumType.as === "i64") {
                return 8;
            }
            throw new Error(`Unknown enum target type for enum ${enumType.shortname()} ${enumType.as}`);
        }

        case "reference": {
            let ref = type as ReferenceType;
            if(ref.baseType === null) {
                throw new Error(`Reference type ${type.shortname()} is missing a base type`);
            }
            return getDataTypeByteSize(ref.baseType);
        }

        default : {
            throw new Error(`${type.shortname()} aka ${type.kind} number types should not be used in the code generator`);
        }
    }
}