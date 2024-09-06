import { BinaryExpressionOperator } from "../ast/expressions/BinaryExpression";
import { Context } from "../ast/symbol/Context";
import { BasicType } from "../ast/types/BasicType";
import { DataType } from "../ast/types/DataType";
import { EnumType } from "../ast/types/EnumType";
import { IRInstructionType } from "./bytecode/IR";


/**
 * A local is a local variable access
 */
export function localType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "local_i8";
        if(u.kind == "u8") return "local_u8";
        if(u.kind == "i16") return "local_i16";
        if(u.kind == "u16") return "local_u16";
        if(u.kind == "i32") return "local_i32";
        if(u.kind == "u32") return "local_u32";
        if(u.kind == "i64") return "local_i64";
        if(u.kind == "u64") return "local_u64";
        if(u.kind == "f32") return "local_f32";
        if(u.kind == "f64") return "local_f64";
        if(u.kind == "array") return "local_ptr";
        if(u.kind == "bool") return "local_u8";
    }
    if(u instanceof EnumType){
        return ("local_"+u.as) as IRInstructionType;
    }
    return "local_ptr";
}

/**
 * Global type
 */
export function globalType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "global_i8";
        if(u.kind == "u8") return "global_u8";
        if(u.kind == "i16") return "global_i16";
        if(u.kind == "u16") return "global_u16";
        if(u.kind == "i32") return "global_i32";
        if(u.kind == "u32") return "global_u32";
        if(u.kind == "i64") return "global_i64";
        if(u.kind == "u64") return "global_u64";
        if(u.kind == "f32") return "global_f32";
        if(u.kind == "f64") return "global_f64";
        if(u.kind == "array") return "global_ptr";
        if(u.kind == "bool") return "global_u8";
    }
    if(u instanceof EnumType){
        return ("global_"+u.as) as IRInstructionType;
    }
    return "global_ptr";
}

/**
 * TMP: stores a local/arg into a tmp register
 * @param u 
 * @returns 
 */
export function tmpType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "tmp_i8";
        if(u.kind == "u8") return "tmp_u8";
        if(u.kind == "i16") return "tmp_i16";
        if(u.kind == "u16") return "tmp_u16";
        if(u.kind == "i32") return "tmp_i32";
        if(u.kind == "u32") return "tmp_u32";
        if(u.kind == "i64") return "tmp_i64";
        if(u.kind == "u64") return "tmp_u64";
        if(u.kind == "f32") return "tmp_f32";
        if(u.kind == "f64") return "tmp_f64";
        if(u.kind == "array") return "tmp_ptr";
        if(u.kind == "bool") return "tmp_u8";
    }
    if(u instanceof EnumType){
        return ("tmp_"+u.as) as IRInstructionType;
    }
    return "tmp_ptr";
}


export function retType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "ret_i8";
        if(u.kind == "u8") return "ret_u8";
        if(u.kind == "i16") return "ret_i16";
        if(u.kind == "u16") return "ret_u16";
        if(u.kind == "i32") return "ret_i32";
        if(u.kind == "u32") return "ret_u32";
        if(u.kind == "i64") return "ret_i64";
        if(u.kind == "u64") return "ret_u64";
        if(u.kind == "f32") return "ret_f32";
        if(u.kind == "f64") return "ret_f64";
        if(u.kind == "array") return "ret_ptr";
        if(u.kind == "bool") return "ret_u8";
    }
    if(u instanceof EnumType){
        return ("ret_"+u.as) as IRInstructionType;
    }
    return "ret_ptr";
}

/**
 * Const: assigns a constant value to a tmp register
 */
export function constType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "const_i8";
        if(u.kind == "u8") return "const_u8";
        if(u.kind == "i16") return "const_i16";
        if(u.kind == "u16") return "const_u16";
        if(u.kind == "i32") return "const_i32";
        if(u.kind == "u32") return "const_u32";
        if(u.kind == "i64") return "const_i64";
        if(u.kind == "u64") return "const_u64";
        if(u.kind == "f32") return "const_f32";
        if(u.kind == "f64") return "const_f64";
        if(u.kind == "array") return "const_ptr";
        if(u.kind == "bool") return "const_u8";
    }
    if(u instanceof EnumType){
        return ("const_"+u.as) as IRInstructionType;
    }
    return "const_ptr";
}

export function arraySetIndexType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "a_set_index_i8";
        if(u.kind == "u8") return "a_set_index_u8";
        if(u.kind == "i16") return "a_set_index_i16";
        if(u.kind == "u16") return "a_set_index_u16";
        if(u.kind == "i32") return "a_set_index_i32";
        if(u.kind == "u32") return "a_set_index_u32";
        if(u.kind == "i64") return "a_set_index_i64";
        if(u.kind == "u64") return "a_set_index_u64";
        if(u.kind == "f32") return "a_set_index_f32";
        if(u.kind == "f64") return "a_set_index_f64";
        if(u.kind == "array") return "a_set_index_ptr";
        if(u.kind == "bool") return "a_set_index_u8";
    }
    if(u instanceof EnumType){
        return ("a_set_index_"+u.as) as IRInstructionType;
    }
    return "a_set_index_ptr";
}

export function arrayGetIndexType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "a_get_index_i8";
        if(u.kind == "u8") return "a_get_index_u8";
        if(u.kind == "i16") return "a_get_index_i16";
        if(u.kind == "u16") return "a_get_index_u16";
        if(u.kind == "i32") return "a_get_index_i32";
        if(u.kind == "u32") return "a_get_index_u32";
        if(u.kind == "i64") return "a_get_index_i64";
        if(u.kind == "u64") return "a_get_index_u64";
        if(u.kind == "f32") return "a_get_index_f32";
        if(u.kind == "f64") return "a_get_index_f64";
        if(u.kind == "array") return "a_get_index_ptr";
        if(u.kind == "bool") return "a_get_index_u8";
    }
    if(u instanceof EnumType){
        return ("a_get_index_"+u.as) as IRInstructionType;
    }
    return "a_get_index_ptr";
}


export function structSetFieldType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "s_set_field_i8";
        if(u.kind == "u8") return "s_set_field_u8";
        if(u.kind == "i16") return "s_set_field_i16";
        if(u.kind == "u16") return "s_set_field_u16";
        if(u.kind == "i32") return "s_set_field_i32";
        if(u.kind == "u32") return "s_set_field_u32";
        if(u.kind == "i64") return "s_set_field_i64";
        if(u.kind == "u64") return "s_set_field_u64";
        if(u.kind == "f32") return "s_set_field_f32";
        if(u.kind == "f64") return "s_set_field_f64";
        if(u.kind == "array") return "s_set_field_ptr";
        if(u.kind == "bool") return "s_set_field_u8";
    }
    if(u instanceof EnumType){
        return ("s_set_field_"+u.as) as IRInstructionType;
    }
    return "s_set_field_ptr";
}

export function structGetFieldType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "s_get_field_i8";
        if(u.kind == "u8") return "s_get_field_u8";
        if(u.kind == "i16") return "s_get_field_i16";
        if(u.kind == "u16") return "s_get_field_u16";
        if(u.kind == "i32") return "s_get_field_i32";
        if(u.kind == "u32") return "s_get_field_u32";
        if(u.kind == "i64") return "s_get_field_i64";
        if(u.kind == "u64") return "s_get_field_u64";
        if(u.kind == "f32") return "s_get_field_f32";
        if(u.kind == "f64") return "s_get_field_f64";
        if(u.kind == "array") return "s_get_field_ptr";
        if(u.kind == "bool") return "s_get_field_u8";
    }
    if(u instanceof EnumType){
        return ("s_get_field_"+u.as) as IRInstructionType;
    }
    return "s_get_field_ptr";
}

export function fnSetArgType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "fn_set_reg_i8";
        if(u.kind == "u8") return "fn_set_reg_u8";
        if(u.kind == "i16") return "fn_set_reg_i16";
        if(u.kind == "u16") return "fn_set_reg_u16";
        if(u.kind == "i32") return "fn_set_reg_i32";
        if(u.kind == "u32") return "fn_set_reg_u32";
        if(u.kind == "i64") return "fn_set_reg_i64";
        if(u.kind == "u64") return "fn_set_reg_u64";
        if(u.kind == "f32") return "fn_set_reg_f32";
        if(u.kind == "f64") return "fn_set_reg_f64";
        if(u.kind == "array") return "fn_set_reg_ptr";
        if(u.kind == "bool") return "fn_set_reg_u8";
    }
    if(u instanceof EnumType){
        return ("fn_set_reg_"+u.as) as IRInstructionType;
    }
    return "fn_set_reg_ptr";
}

export function pushStackType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "push_i8";
        if(u.kind == "u8") return "push_u8";
        if(u.kind == "i16") return "push_i16";
        if(u.kind == "u16") return "push_u16";
        if(u.kind == "i32") return "push_i32";
        if(u.kind == "u32") return "push_u32";
        if(u.kind == "i64") return "push_i64";
        if(u.kind == "u64") return "push_u64";
        if(u.kind == "f32") return "push_f32";
        if(u.kind == "f64") return "push_f64";
        if(u.kind == "array") return "push_ptr";
        if(u.kind == "bool") return "push_u8";
    }
    if(u instanceof EnumType){
        return ("push_"+u.as) as IRInstructionType;
    }
    return "push_ptr";
}

export function popStackType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "pop_i8";
        if(u.kind == "u8") return "pop_u8";
        if(u.kind == "i16") return "pop_i16";
        if(u.kind == "u16") return "pop_u16";
        if(u.kind == "i32") return "pop_i32";
        if(u.kind == "u32") return "pop_u32";
        if(u.kind == "i64") return "pop_i64";
        if(u.kind == "u64") return "pop_u64";
        if(u.kind == "f32") return "pop_f32";
        if(u.kind == "f64") return "pop_f64";
        if(u.kind == "array") return "pop_ptr";
        if(u.kind == "bool") return "pop_u8";
    }
    if(u instanceof EnumType){
        return ("pop_"+u.as) as IRInstructionType;
    }
    return "pop_ptr";
}

export function classSetFieldType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "c_set_field_i8";
        if(u.kind == "u8") return "c_set_field_u8";
        if(u.kind == "i16") return "c_set_field_i16";
        if(u.kind == "u16") return "c_set_field_u16";
        if(u.kind == "i32") return "c_set_field_i32";
        if(u.kind == "u32") return "c_set_field_u32";
        if(u.kind == "i64") return "c_set_field_i64";
        if(u.kind == "u64") return "c_set_field_u64";
        if(u.kind == "f32") return "c_set_field_f32";
        if(u.kind == "f64") return "c_set_field_f64";
        if(u.kind == "array") return "c_set_field_ptr";
        if(u.kind == "bool") return "c_set_field_u8";
    }
    if(u instanceof EnumType){
        return ("c_set_field_"+u.as) as IRInstructionType;
    }
    return "c_set_field_ptr";
}

export function classGetFieldType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "c_get_field_i8";
        if(u.kind == "u8") return "c_get_field_u8";
        if(u.kind == "i16") return "c_get_field_i16";
        if(u.kind == "u16") return "c_get_field_u16";
        if(u.kind == "i32") return "c_get_field_i32";
        if(u.kind == "u32") return "c_get_field_u32";
        if(u.kind == "i64") return "c_get_field_i64";
        if(u.kind == "u64") return "c_get_field_u64";
        if(u.kind == "f32") return "c_get_field_f32";
        if(u.kind == "f64") return "c_get_field_f64";
        if(u.kind == "array") return "c_get_field_ptr";
        if(u.kind == "bool") return "c_get_field_u8";
    }
    if(u instanceof EnumType){
        return ("c_get_field_"+u.as) as IRInstructionType;
    }
    return "c_get_field_ptr";
}

/**
 * Arg is a function argument access
 */
export function argType(ctx: Context, v: DataType): IRInstructionType {
    let u = v.dereference();
    if(u instanceof BasicType) {
        if(u.kind == "i8") return "arg_i8";
        if(u.kind == "u8") return "arg_u8";
        if(u.kind == "i16") return "arg_i16";
        if(u.kind == "u16") return "arg_u16";
        if(u.kind == "i32") return "arg_i32";
        if(u.kind == "u32") return "arg_u32";
        if(u.kind == "i64") return "arg_i64";
        if(u.kind == "u64") return "arg_u64";
        if(u.kind == "f32") return "arg_f32";
        if(u.kind == "f64") return "arg_f64";
        if(u.kind == "array") return "arg_ptr";
        if(u.kind == "bool") return "arg_u8";
    }
    if(u instanceof EnumType){
        return ("arg_"+u.as) as IRInstructionType;
    }
    return "arg_ptr";
}


/**
 * Binary operators
 */

const addInstructions: {[key:string]: IRInstructionType} = {
    "u8": "add_u8",
    "u16": "add_u16",
    "u32": "add_u32",
    "u64": "add_u64",
    "i8": "add_i8",
    "i16": "add_i16",
    "i32": "add_i32",
    "i64": "add_i64",
    "f32": "add_f32",
    "f64": "add_f64"
}

const subInstructions: {[key:string]: IRInstructionType} = {
    "u8": "sub_u8",
    "u16": "sub_u16",
    "u32": "sub_u32",
    "u64": "sub_u64",
    "i8": "sub_i8",
    "i16": "sub_i16",
    "i32": "sub_i32",
    "i64": "sub_i64",
    "f32": "sub_f32",
    "f64": "sub_f64"
}

const mulInstructions: {[key:string]: IRInstructionType} = {
    "u8": "mul_u8",
    "u16": "mul_u16",
    "u32": "mul_u32",
    "u64": "mul_u64",
    "i8": "mul_i8",
    "i16": "mul_i16",
    "i32": "mul_i32",
    "i64": "mul_i64",
    "f32": "mul_f32",
    "f64": "mul_f64"
}

const divInstructions: {[key:string]: IRInstructionType} = {
    "u8": "div_u8",
    "u16": "div_u16",
    "u32": "div_u32",
    "u64": "div_u64",
    "i8": "div_i8",
    "i16": "div_i16",
    "i32": "div_i32",
    "i64": "div_i64",
    "f32": "div_f32",
    "f64": "div_f64"
}

const modInstructions: {[key:string]: IRInstructionType} = {
    "u8": "mod_u8",
    "u16": "mod_u16",
    "u32": "mod_u32",
    "u64": "mod_u64",
    "i8": "mod_i8",
    "i16": "mod_i16",
    "i32": "mod_i32",
    "i64": "mod_i64"
}

const lshiftInstructions: {[key:string]: IRInstructionType} = {
    "u8": "lshift_u8",
    "u16": "lshift_u16",
    "u32": "lshift_u32",
    "u64": "lshift_u64",
    "i8": "lshift_i8",
    "i16": "lshift_i16",
    "i32": "lshift_i32",
    "i64": "lshift_i64"
}

const rshiftInstructions: {[key:string]: IRInstructionType} = {
    "u8": "rshift_u8",
    "u16": "rshift_u16",
    "u32": "rshift_u32",
    "u64": "rshift_u64",
    "i8": "rshift_i8",
    "i16": "rshift_i16",
    "i32": "rshift_i32",
    "i64": "rshift_i64"
}

const cmpInstructions: {[key:string]: IRInstructionType} = {
    "u8": "j_cmp_u8",
    "u16": "j_cmp_u16",
    "u32": "j_cmp_u32",
    "u64": "j_cmp_u64",
    "i8": "j_cmp_i8",
    "i16": "j_cmp_i16",
    "i32": "j_cmp_i32",
    "i64": "j_cmp_i64",
    "bool": "j_cmp_u8",
    "f32": "j_cmp_f32",
    "f64": "j_cmp_f64"
}

const bAndInstructions: {[key:string]: IRInstructionType} = {
    "u8": "band_u8",
    "u16": "band_u16",
    "u32": "band_u32",
    "u64": "band_u64",
    "i8": "band_i8",
    "i16": "band_i16",
    "i32": "band_i32",
    "i64": "band_i64"
}

const bOrInstructions: {[key:string]: IRInstructionType} = {
    "u8": "bor_u8",
    "u16": "bor_u16",
    "u32": "bor_u32",
    "u64": "bor_u64",
    "i8": "bor_i8",
    "i16": "bor_i16",
    "i32": "bor_i32",
    "i64": "bor_i64"
}

const bXorInstructions: {[key:string]: IRInstructionType} = {
    "u8": "bxor_u8",
    "u16": "bxor_u16",
    "u32": "bxor_u32",
    "u64": "bxor_u64",
    "i8": "bxor_i8",
    "i16": "bxor_i16",
    "i32": "bxor_i32",
    "i64": "bxor_i64"
}

const andInstructions: {[key:string]: IRInstructionType} = {
    "bool": "and"
}

const orInstructions: {[key:string]: IRInstructionType} = {
    "bool": "or"
}


/**
 * TODO: support enums here?
 * @param dt
 * @param op 
 * @returns 
 */
export function getBinaryInstruction(dt: BasicType, op: BinaryExpressionOperator): IRInstructionType {
    if(op == "+"){
        return addInstructions[dt.kind];
    }
    if(op == "-"){
        return subInstructions[dt.kind];
    }
    if(op == "*"){
        return mulInstructions[dt.kind];
    }
    if(op == "/"){
        return divInstructions[dt.kind];
    }
    if(op == "%"){
        return modInstructions[dt.kind];
    }
    if(op == "<<"){
        return lshiftInstructions[dt.kind];
    }
    if(op == ">>"){
        return rshiftInstructions[dt.kind];
    }
    // cmp
    if(op == "=="){
        return cmpInstructions[dt.kind];
    }
    if(op == "!="){
        return cmpInstructions[dt.kind];
    }
    if(op == ">"){
        return cmpInstructions[dt.kind];
    }
    if(op == ">="){
        return cmpInstructions[dt.kind];
    }
    if(op == "<"){
        return cmpInstructions[dt.kind];
    }
    if(op == "<="){
        return cmpInstructions[dt.kind];
    }
    // end of cmp
    if(op == "&"){
        return bAndInstructions[dt.kind];
    }
    if(op == "|"){
        return bOrInstructions[dt.kind];
    }
    if(op == "^"){
        return bXorInstructions[dt.kind];
    }
    if(op == "&&"){
        return andInstructions[dt.kind];
    }
    if(op == "||"){
        return orInstructions[dt.kind];
    }
    throw new Error("Unsupported binary operator " + op);   
}


/**
 * Unary operators
 */
const bNotInstructions: {[key:string]: IRInstructionType} = {
    "u8": "bnot_u8",
    "u16": "bnot_u16",
    "u32": "bnot_u32",
    "u64": "bnot_u64",
    "i8": "bnot_i8",
    "i16": "bnot_i16",
    "i32": "bnot_i32",
    "i64": "bnot_i64"
}

const notInstructions: {[key:string]: IRInstructionType} = {
    "bool": "not"
}

const bitwiseNotInstructions: {[key:string]: IRInstructionType} = {
    "u8": "bnot_u8",
    "u16": "bnot_u16",
    "u32": "bnot_u32",
    "u64": "bnot_u64",
    "i8": "bnot_i8",
    "i16": "bnot_i16",
    "i32": "bnot_i32",
    "i64": "bnot_i64"
}

const negInstructions: {[key:string]: IRInstructionType} = {
    "u8": "sub_u8",
    "u16": "sub_u16",
    "u32": "sub_u32",
    "u64": "sub_u64",
    "i8": "sub_i8",
    "i16": "sub_i16",
    "i32": "sub_i32",
    "i64": "sub_i64",
    "f32": "sub_f32",
    "f64": "sub_f64"
}

export function getUnaryInstruction(dt: BasicType, op: string): IRInstructionType {
    if(op == "!"){
        return notInstructions[dt.kind];
    }
    if(op == "~"){
        return bitwiseNotInstructions[dt.kind];
    }
    if(op == "-"){
        return negInstructions[dt.kind];
    }
    throw new Error("Unsupported unary operator " + op);   
}