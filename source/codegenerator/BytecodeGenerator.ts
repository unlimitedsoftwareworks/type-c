/**
 * Filename: BytecodeGenerator.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Bytecode generator from IR
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { ClassAttribute } from "../ast/other/ClassAttribute";
import { ClassMethod } from "../ast/other/ClassMethod";
import { InterfaceMethod } from "../ast/other/InterfaceMethod";
import { DeclaredVariable } from "../ast/symbol/DeclaredVariable";
import { StructField } from "../ast/types/StructType";
import { BytecodeInstructionType } from "./bytecode/BytecodeInstructions";
import { CodeSegment } from "./CodeSegment";
import { FunctionGenerator } from "./FunctionGenerator";
import { generatePerfectHash } from "./hashing/GenerateHash";
import { ObjectKeysSegment } from "./ObjectKeysSegment";
import { TemplateSegment } from "./TemplateSegment";

function parseCStyleNumber(cNumberString: string): number | bigint {
    let isFloat = false;
    // Check if the string ends with 'f' or 'F' and remove it
    if (cNumberString.endsWith('f') || cNumberString.endsWith('F')) {
        cNumberString = cNumberString.slice(0, -1);
        isFloat = true;
    }
    if(cNumberString.includes('.')){
        isFloat = true;
    }

    // Parse the string as a number (float or integer, including exponent notation)
    if(isFloat){
        return parseFloat(cNumberString);
    }
    else {
        return BigInt(cNumberString);
    }

    // Check for parsing errors
    //if (isNaN(numberValue)) {
    //    throw new Error("Invalid number format");
    //}

    // return numberValue;
}

function floatToUint32Bits(floatValue: number | bigint) {
    // Convert float to BigInt for consistency
    // Create an ArrayBuffer with 4 bytes to hold a 32-bit float
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);

    // Set the float value at byte offset 0
    view.setFloat32(0, Number(floatValue));

    // Read the bits as an unsigned 32-bit integer
    return BigInt(view.getUint32(0));
}

function doubleToUint64BitsLE(doubleValue: number | bigint) {
    // Convert double to BigInt for consistency
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);

    // Set the double value at byte offset 0, little-endian
    view.setFloat64(0, Number(doubleValue), true);

    // Read the bits as two 32-bit unsigned integers (low and high) in little-endian order
    const low = BigInt(view.getUint32(0, true));
    const high = BigInt(view.getUint32(4, true));

    // Combine the high and low parts into a 64-bit BigInt representation
    return (high << 32n) | low;
}


interface SourceMapEntry {
    line: number;
    file: string;
    col: number;
    func: string
}

/**
 * Converts JSON sourcemap to a line-mapped text format
 * @param sourceMap
 * @param totalLines
 * @returns
 */
function convertToLineMappedText(sourceMap: Record<string, SourceMapEntry>): string {
    let totalLines = Object.keys(sourceMap)
        .map((key) => parseInt(key))
        .reduce((a, b) => Math.max(a, b), 0);
    const lines = new Array(totalLines).fill('');

    for (const [instructionId, entry] of Object.entries(sourceMap)) {
        const lineIndex = parseInt(instructionId) - 1; // assuming instructionId is 1-indexed
        if (lineIndex >= 0 && lineIndex < totalLines) {
            lines[lineIndex] = `${entry.file},${entry.line},${entry.col},${entry.func}`;
        }
    }

    return lines.join('\n');
}


type ByteCodeConstant = {
    intValue?: number;
    floatValue?: number;
    byteSize: number;
    arrayValue?: number[]; // for strings, stored as array of bytes (utf8 encoding)
}

/**
 * Every constant will
 */
class ConstantSegment {
    u8: ByteCodeConstant[] = [];
    byteSize: number = 0;
    toJSON() {
        return this.u8;
    }

    /**
     * Adds a constant to the segment
     * @returns the offset of the constant in the segment
     * @param constant
     */
    addConstant(constant: ByteCodeConstant): number {
        // first, if it is a string, we just add it to the segment
        let byteSize = constant.byteSize;
        if (constant.arrayValue != undefined) {
            byteSize *= constant.arrayValue.length;
        }
        else {

            // check if a constant with the same value already exists
            // the size could be less, but not more

            // currently buggy.
            /*let size = 0;
            for(let i = 0; i < this.ByteCodeConstants.length; i++){
                if(constant.intValue != undefined){
                    if((this.ByteCodeConstants[i].intValue == constant.intValue) && (this.ByteCodeConstants[i].byteSize == constant.byteSize)){
                        return size;
                    }
                }
                if(constant.floatValue != undefined) {
                    if((this.ByteCodeConstants[i].floatValue == constant.floatValue) && (this.ByteCodeConstants[i].byteSize == constant.byteSize)){
                        return size;
                    }
                }
                size += this.ByteCodeConstants[i].byteSize;
            }*/
        }

        // add the constant
        this.u8.push(constant);
        let pos = this.byteSize;
        this.byteSize += byteSize;
        return pos;
    }

    serialize(): ArrayBuffer {
        // Create a buffer with the total size of all constants
        let buffer = new ArrayBuffer(this.byteSize);
        let view = new DataView(buffer);

        // Offset to keep track of where to write in the buffer
        let offset = 0;

        // Iterate through each constant and serialize it into the buffer
        this.u8.forEach(constant => {
            if (constant.arrayValue !== undefined) {
                // Handle string serialization
                for (let i = 0; i < constant.arrayValue.length; i++) {
                    view.setUint8(offset, constant.arrayValue[i] as number);
                    offset++;
                }
            } else {
                // Handle other types (int and float)
                switch (constant.byteSize) {
                    case 1:
                        view.setUint8(offset, constant.intValue as number);
                        break;
                    case 2:
                        view.setUint16(offset, constant.intValue as number, true); // true for little-endian
                        break;
                    case 4:
                        if (constant.floatValue !== undefined) {
                            view.setFloat32(offset, constant.floatValue!, true); // true for little-endian
                        } else {
                            view.setUint32(offset, constant.intValue as number, true);
                        }
                        break;
                    case 8:
                        if (constant.floatValue !== undefined) {
                            view.setFloat64(offset, constant.floatValue as number, true); // true for little-endian
                        } else {
                            view.setBigUint64(offset, BigInt(constant.intValue as number), true);
                        }
                        break;
                    default:
                        throw new Error("Unsupported byte size");
                }
                // Increment the offset by the byte size of the constant
                offset += constant.byteSize;
            }
        });
        return buffer;
    }
}

class GlobalSegment {
    variables: Map<string, number> = new Map();
    byteSize: number = 0;

    /**
     * Adds a variable or class attribute to global segment
     * @param variable variable or class attribute
     * @param attributeSize attribute size in case of class attribute
     */
    addVariable(variable: DeclaredVariable | ClassAttribute, attributeSize?: number) {
        // check if variable already exists
        if (this.variables.get(variable.uid)) {
            throw "Redefined global variable " + variable.name;
        }
        this.variables.set(variable.uid, this.byteSize);
        if (variable instanceof DeclaredVariable || variable instanceof ClassAttribute) {
            // we always use 8 bytes for global variables, to keep alignment
            this.byteSize += 8 ; //getDataTypeByteSize(variable.annotation!);
        }
        else {
            if (attributeSize == undefined) {
                throw "Attribute size not defined";
            }
            this.byteSize += attributeSize!;
        }
    }

    getVariableOffset(variable: string): number {
        let offset = 0;
        let v = this.variables.get(variable);
        if (v != undefined) {
            return v
        }
        else {
            throw "Variable " + variable + " not found in global segment";
        }
    }

    serialize() {
        // return buffer filled with zeros
        let buffer = new ArrayBuffer(this.byteSize);
        return buffer;
    }
}

export class BytecodeGenerator {
    constantSegment: ConstantSegment = new ConstantSegment();
    globalSegment: GlobalSegment = new GlobalSegment();
    templateSegment: TemplateSegment = new TemplateSegment();
    objectKeysSegment: ObjectKeysSegment = new ObjectKeysSegment();
    
    unresolvedOffsets: Map<string, number[]> = new Map();
    resolvedOffsets: Map<string, number> = new Map();

    codeSegment: CodeSegment = new CodeSegment();

    /**
     * Src mapping utils
     */
    instructionSrcMap: { [key: number]: SourceMapEntry } = {};
    srcMapStack: SourceMapEntry[] = [];
    pushMapLoc(loc: SourceMapEntry) {
        this.srcMapStack.push(loc);
    }
    popMapLoc() {
        this.srcMapStack.pop();
    }
    getActiveMapLoc(): SourceMapEntry | null {
        if (this.srcMapStack.length == 0) {
            return null;
        }
        return this.srcMapStack[this.srcMapStack.length - 1];
    }
    codeSegmentSrcMap: { [key: number]: { file: string, line: number, col: number, func: string} } = {}
    pushCodeLoc(loc: SourceMapEntry) {
        this.codeSegmentSrcMap[this.codeSegment.writer.writePosition] = { line: loc.line, file: loc.file, col: loc.col, func: loc.func };
    }

    addGlobalVariable(variable: DeclaredVariable | ClassAttribute, attributeSize?: number) {
        this.globalSegment.addVariable(variable, attributeSize);
    }

    getRegisterForVariable(fn: FunctionGenerator, variable: string): number {
        let res = fn.coloring.get(variable);

        if (res == undefined) {
            throw "Variable " + variable + " not found in register allocation";
        }

        return res;
    }

    addUnresolvedOffset(uid: string, offset: number) {
        if(uid == undefined) {
            throw "Undefined uid";
        }
        let offsets = this.unresolvedOffsets.get(uid);
        if (!offsets) {
            offsets = [];
            this.unresolvedOffsets.set(uid, offsets);
        }

        offsets.push(offset);
    }

    emit(instruction: BytecodeInstructionType, ...args: (number | bigint)[]) {
        let loc = this.getActiveMapLoc();
        if (loc != null) {
            this.pushCodeLoc(loc);
        }
        let num = this.codeSegment.emit(instruction, ...args);
        return num
    }

    emitCustom(data: number, bytes: number | null) {
        let num = this.codeSegment.emitCustom(data, bytes);
        return num
    }

    /**
     * returns the offset of a local or argument variable
     */
    getSymbolStackOffset(fnGen: FunctionGenerator, id: string) {
        let res = fnGen.fn.codeGenProps.getSymbolStackOffset(id);
        if (res == undefined) {
            throw "Variable " + id + " not found in local/arg offset map";
        }

        return res;
    }

    /**
     * Checks if a function is a class method
     * @param fn
     * @returns
     */
    isClassMethod(fnGen: FunctionGenerator): boolean {
        return fnGen.fn instanceof ClassMethod;
    }

    resolveLabel(label: string, offset: number) {
        let res = this.resolvedOffsets.get(label);
        this.templateSegment.resolveForLabel(label, offset);
        if (res != undefined) {
            throw "Label " + label + " already resolved";
        }
        this.resolvedOffsets.set(label, offset);
    }

    resolveLabels() {
        // resolve labels
        for (let [label, offsets] of this.unresolvedOffsets) {
            let value = this.resolvedOffsets.get(label);
            if (value == undefined) {
                throw "Label " + label + " not found";
            }

            for (let offset of offsets) {
                this.codeSegment.emitAtCustom(offset, value, 4);
            }

            // resolve for template
            this.templateSegment.resolveForLabel(label, value);
        }


        /**
         * Because template segment and function generator are not in sync, template might reference a class method that is not yet resolved
         * We resolve it here, at the end of bytecode generation
         */
        if(!this.templateSegment.checkAllResolved()) {
            // get what it is missing from unresolvedOffsets
            for(const [lbl, offsets] of Object.entries(this.templateSegment.unresolvedLabels)) {
                if(this.unresolvedOffsets.has(lbl)) {
                    throw "Label " + lbl + " not resolved";
                }
                else {
                    // resolve it
                    this.templateSegment.resolveForLabel(lbl, this.resolvedOffsets.get(lbl)!);
                }
            }
        }
    }

    emitCallMain(main_id: string, mainReturnSize: number, mainRequireArgs: boolean) {
        this.emit(BytecodeInstructionType.fn_alloc);
        // the argument is saved into R0 within the VM, so we set it R0 of the main function. i.e state->next->regs[0]
        if (mainRequireArgs) {
            this.emit(BytecodeInstructionType.fn_set_reg_ptr, 0, 0);
        }
        let lbl = this.emit(BytecodeInstructionType.fn_calli, 0);
        this.addUnresolvedOffset(main_id, lbl);

        if (mainReturnSize != 0) {
            // TODO: cast if needed!
            this.emit(BytecodeInstructionType.fn_get_ret_reg, 255, 255, mainReturnSize);
            //this.emit(BytecodeInstructionType.debug_reg, 255);
        }
        //for(let i = 0; i < 21 ; i++) {
        //this.emit(BytecodeInstructionType.debug_reg, i);
        //}
        this.emit(BytecodeInstructionType.halt, 255);
    }

    generateBytecode(fn: FunctionGenerator) {
        for (let i = 0; i < fn.instructions.length; i++) {
            let instruction = fn.instructions[i];

            if (instruction.type == "debug") continue;
            else if (instruction.type == "destroy_tmp") continue;
            else if (instruction.type == "srcmap_push_loc") {
                this.pushMapLoc({ file: instruction.args[0] as string, line: instruction.args[1] as number, col: instruction.args[2] as number, func: instruction.args[3] as string});
            }
            else if (instruction.type == "srcmap_pop_loc") {
                this.popMapLoc();
            }

            else if (instruction.type == "label") {
                this.resolveLabel(instruction.args[0] as string, this.codeSegment.writer.writePosition);
            }

            else if (instruction.type == "const_i8" || instruction.type == "const_u8") {
                let intVal = parseCStyleNumber(instruction.args[1] + "")
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                if(intVal == 0) {
                    this.emit(BytecodeInstructionType.mv_reg_null, reg)
                }
                else {
                    //let c = this.constantSegment.addConstant({ byteSize: 1, intValue: intVal });
                    this.emit(BytecodeInstructionType.mv_reg_i, reg, intVal);
                }
            }
            else if (instruction.type == "const_i16" || instruction.type == "const_u16") {
                let intVal = parseCStyleNumber(instruction.args[1] + "")
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                if(intVal == 0) {
                    this.emit(BytecodeInstructionType.mv_reg_null, reg)
                }
                else {
                    //let c = this.constantSegment.addConstant({ byteSize: 2, intValue: intVal });
                    this.emit(BytecodeInstructionType.mv_reg_i, reg, intVal);
                }
            }
            else if (instruction.type == "const_i32" || instruction.type == "const_u32") {
                let intVal = parseCStyleNumber(instruction.args[1] + "")
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                if(intVal == 0) {
                    this.emit(BytecodeInstructionType.mv_reg_null, reg)
                }
                else {
                    //let c = this.constantSegment.addConstant({ byteSize: 4, intValue: intVal });
                    this.emit(BytecodeInstructionType.mv_reg_i, reg, intVal);
                }
            }
            else if (instruction.type == "const_f32") {
                let intVal = parseCStyleNumber(instruction.args[1] + "")
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                if(intVal == 0) {
                    this.emit(BytecodeInstructionType.mv_reg_null, reg)
                }
                else {
                    //let c = this.constantSegment.addConstant({ byteSize: 4, floatValue: intVal });
                    let fVal = floatToUint32Bits(intVal);
                    this.emit(BytecodeInstructionType.mv_reg_i, reg, fVal);
                }
            }
            else if (instruction.type == "const_i64" || instruction.type == "const_u64") {
                let intVal = parseCStyleNumber(instruction.args[1] + "")
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                if(intVal == 0) {
                    this.emit(BytecodeInstructionType.mv_reg_null, reg)
                }
                else {
                    //let c = this.constantSegment.addConstant({ byteSize: 8, intValue: intVal });
                    this.emit(BytecodeInstructionType.mv_reg_i, reg, intVal);
                }
            }
            else if (instruction.type == "const_f64") {
                let intVal = parseCStyleNumber(instruction.args[1] + "")
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                if(intVal == 0) {
                    this.emit(BytecodeInstructionType.mv_reg_null, reg)
                }
                else {
                    //let c = this.constantSegment.addConstant({ byteSize: 8, floatValue: intVal });
                    let dVal = doubleToUint64BitsLE(intVal);
                    this.emit(BytecodeInstructionType.mv_reg_i, reg, dVal);
                }
            }
            else if (instruction.type == "const_ptr") {
                let intVal = parseCStyleNumber(instruction.args[1] + "")
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                if(intVal == 0) {
                    this.emit(BytecodeInstructionType.mv_reg_null, reg)
                }
                else {
                    //let c = this.constantSegment.addConstant({ byteSize: 8, intValue: intVal });
                    this.emit(BytecodeInstructionType.mv_reg_i, reg, intVal);
                }
            }
            else if (instruction.type == "const_ptr_fn") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);

                let lbl = this.emit(BytecodeInstructionType.mv_reg_i_ptr, reg, 0);
                this.addUnresolvedOffset(instruction.args[1] as string, lbl);
            }
            else if (instruction.type == "const_str") {
                const encoder = new TextEncoder();
                const str_bytes = Array.from(encoder.encode(instruction.args[2] as string))
                const str_byte_len = str_bytes.length;

                let c = this.constantSegment.addConstant({ byteSize: 1, arrayValue: str_bytes });
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let indexReg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.a_alloc, reg, 0, str_byte_len, 1);
                for (let i = 0; i < str_byte_len; i++) {
                    this.emit(BytecodeInstructionType.mv_reg_i, indexReg, i);
                    this.emit(BytecodeInstructionType.a_storef_const, reg, indexReg, c + i, 1);
                }
            }
            else if (instruction.type == "tmp_i8" || instruction.type == "tmp_u8") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let type = instruction.args[1] as string;
                let id = instruction.args[2] as string;
                if (type == "global") {
                    let varOffset = this.globalSegment.getVariableOffset(id);
                    this.emit(BytecodeInstructionType.mv_reg_global, reg, varOffset, 1);
                }
                else if (type == "reg" || type == "reg_copy") {
                    let reg2 = this.getRegisterForVariable(fn, id);
                    if(reg != reg2)
                        this.emit(BytecodeInstructionType.mv_reg_reg, reg, reg2, 1);
                }
                else if (type == "func") {
                    // func is ptr, throw error
                    throw "Cannot load function pointer into register of 8 bits";
                }
            }
            else if (instruction.type == "tmp_i16" || instruction.type == "tmp_u16") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let type = instruction.args[1] as string;
                let id = instruction.args[2] as string;
                if (type == "global") {
                    let varOffset = this.globalSegment.getVariableOffset(id);
                    this.emit(BytecodeInstructionType.mv_reg_global, reg, varOffset, 2);
                }
                else if (type == "reg" || type == "reg_copy") {
                    let reg2 = this.getRegisterForVariable(fn, id);
                    if(reg != reg2)
                        this.emit(BytecodeInstructionType.mv_reg_reg, reg, reg2, 2);
                }
                else if (type == "func") {
                    // func is ptr, throw error
                    throw "Cannot load function pointer into register of 16 bits";
                }
            }
            else if (instruction.type == "tmp_i32" || instruction.type == "tmp_u32" || instruction.type == "tmp_f32") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let type = instruction.args[1] as string;
                let id = instruction.args[2] as string;
                if (type == "global") {
                    let varOffset = this.globalSegment.getVariableOffset(id);
                    this.emit(BytecodeInstructionType.mv_reg_global, reg, varOffset, 4);
                }
                else if (type == "reg" || type == "reg_copy") {
                    let reg2 = this.getRegisterForVariable(fn, id);
                    if(reg != reg2)
                        this.emit(BytecodeInstructionType.mv_reg_reg, reg, reg2, 4);
                }
                else if (type == "func") {
                    // func is ptr, throw error
                    throw "Cannot load function pointer into register of 32 bits";
                }
            }
            else if (instruction.type == "tmp_i64" || instruction.type == "tmp_u64" || instruction.type == "tmp_f64") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let type = instruction.args[1] as string;
                let id = instruction.args[2] as string;
                if (type == "global") {
                    let varOffset = this.globalSegment.getVariableOffset(id);
                    this.emit(BytecodeInstructionType.mv_reg_global, reg, varOffset, 8);
                }
                else if (type == "reg" || type == "reg_copy") {
                    let reg2 = this.getRegisterForVariable(fn, id);
                    if(reg != reg2)
                        this.emit(BytecodeInstructionType.mv_reg_reg, reg, reg2, 8);
                }
                else if (type == "func") {
                    // func is ptr, throw error
                    throw "Cannot load function pointer into register of 64 bits";
                }
            }
            else if (instruction.type == "tmp_ptr") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let type = instruction.args[1] as string;
                let id = instruction.args[2] as string;
                if (type == "global") {
                    let varOffset = this.globalSegment.getVariableOffset(id);
                    this.emit(BytecodeInstructionType.mv_reg_global_ptr, reg, varOffset);
                }
                else if (type == "reg" || type == "reg_copy") {
                    let reg2 = this.getRegisterForVariable(fn, id);
                    if(reg != reg2)
                        this.emit(BytecodeInstructionType.mv_reg_reg_ptr, reg, reg2);
                }
                else if (type == "func") {
                    // mv_reg_i will push bytes needed, which 1 one for 0, we add 7 more
                    this.emitCustom(BytecodeInstructionType.mv_reg_i, 1);
                    this.emitCustom(reg, 1);
                    this.emitCustom(8, 1);
                    let lbl = this.codeSegment.writer.writePosition;
                    this.addUnresolvedOffset(id, lbl);
                    this.emitCustom(0, 4);
                }
            }
            else if (instruction.type == "local_i8" || instruction.type == "local_u8" || instruction.type == "arg_i8" || instruction.type == "arg_u8") {
                continue;
            }
            else if (instruction.type == "local_i16" || instruction.type == "local_u16" || instruction.type == "arg_i16" || instruction.type == "arg_u16") {
                continue;
            }
            else if (instruction.type == "local_i32" || instruction.type == "local_u32" || instruction.type == "local_f32" || instruction.type == "arg_i32" || instruction.type == "arg_u32" || instruction.type == "arg_f32") {
                continue;
            }
            else if (instruction.type == "local_i64" || instruction.type == "local_u64" || instruction.type == "local_f64" || instruction.type == "arg_i64" || instruction.type == "arg_u64" || instruction.type == "arg_f64") {
                continue;
            }
            else if (instruction.type == "local_ptr" || instruction.type == "arg_ptr") {
                continue;
            }
            else if (instruction.type == "global_i8" || instruction.type == "global_u8") {
                let id = instruction.args[0] as string;
                let dest = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let offset = this.globalSegment.getVariableOffset(id);
                this.emit(BytecodeInstructionType.mv_global_reg, offset, dest, 1);
            }
            else if (instruction.type == "global_i16" || instruction.type == "global_u16") {
                let id = instruction.args[0] as string;
                let dest = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let offset = this.globalSegment.getVariableOffset(id);
                this.emit(BytecodeInstructionType.mv_global_reg, offset, dest, 2);
            }
            else if (instruction.type == "global_i32" || instruction.type == "global_u32" || instruction.type == "global_f32") {
                let id = instruction.args[0] as string;
                let dest = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let offset = this.globalSegment.getVariableOffset(id);
                this.emit(BytecodeInstructionType.mv_global_reg, offset, dest, 4);
            }
            else if (instruction.type == "global_i64" || instruction.type == "global_u64" || instruction.type == "global_f64") {
                let id = instruction.args[0] as string;
                let dest = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let offset = this.globalSegment.getVariableOffset(id);
                this.emit(BytecodeInstructionType.mv_global_reg, offset, dest, 8);
            }
            else if (instruction.type == "global_ptr") {
                let id = instruction.args[0] as string;
                let dest = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let offset = this.globalSegment.getVariableOffset(id);
                this.emit(BytecodeInstructionType.mv_global_reg_ptr, offset, dest);
            }

            else if (instruction.type == "fn_set_reg_i8" || instruction.type == "fn_set_reg_u8") {
                let reg1 = instruction.args[0] as number;
                let reg2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.fn_set_reg, reg1, reg2, 1);
            }
            else if (instruction.type == "fn_set_reg_i16" || instruction.type == "fn_set_reg_u16") {
                let reg1 = instruction.args[0] as number;
                let reg2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.fn_set_reg, reg1, reg2, 2);
            }
            else if (instruction.type == "fn_set_reg_i32" || instruction.type == "fn_set_reg_f32" || instruction.type == "fn_set_reg_u32") {
                let reg1 = instruction.args[0] as number;
                let reg2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.fn_set_reg, reg1, reg2, 4);
            }
            else if (instruction.type == "fn_set_reg_i64" || instruction.type == "fn_set_reg_u64" || instruction.type == "fn_set_reg_f64") {
                let reg1 = instruction.args[0] as number;
                let reg2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.fn_set_reg, reg1, reg2, 8);
            }
            else if (instruction.type == "fn_set_reg_ptr") {
                let reg1 = instruction.args[0] as number;
                let reg2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.fn_set_reg_ptr, reg1, reg2);
            }

            // get return value from function
            else if (instruction.type == "fn_get_reg_i8" || instruction.type == "fn_get_reg_u8") {
                let reg1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg2 = instruction.args[1] as number;
                this.emit(BytecodeInstructionType.fn_get_ret_reg, reg1, reg2, 1);
            }
            else if (instruction.type == "fn_get_reg_i16" || instruction.type == "fn_get_reg_u16") {
                let reg1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg2 = instruction.args[1] as number;
                this.emit(BytecodeInstructionType.fn_get_ret_reg, reg1, reg2, 2);
            }
            else if (instruction.type == "fn_get_reg_i32" || instruction.type == "fn_get_reg_f32" || instruction.type == "fn_get_reg_u32") {
                let reg1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg2 = instruction.args[1] as number;
                this.emit(BytecodeInstructionType.fn_get_ret_reg, reg1, reg2, 4);
            }
            else if (instruction.type == "fn_get_reg_i64" || instruction.type == "fn_get_reg_u64" || instruction.type == "fn_get_reg_f64") {
                let reg1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg2 = instruction.args[1] as number;
                this.emit(BytecodeInstructionType.fn_get_ret_reg, reg1, reg2, 8);
            }
            else if (instruction.type == "fn_get_reg_ptr") {
                let reg1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg2 = instruction.args[1] as number;
                this.emit(BytecodeInstructionType.fn_get_ret_reg_ptr, reg1, reg2);
            }

            /**
             * Structs
             */
            else if (instruction.type == "s_alloc") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.s_alloc, reg, instruction.args[1] as number, instruction.args[2] as number);
            }
            else if (instruction.type == "s_alloc_t") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let templateID = instruction.args[1] as number;
                this.emit(BytecodeInstructionType.s_alloc_t, reg, templateID);
            }
            else if (instruction.type == "s_reg_field") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let localFieldID = instruction.args[1] as number;
                let globalFieldID = instruction.args[2] as number;
                let offset = instruction.args[3] as number;
                let isPointer = instruction.args[4] as number;

                this.emit(BytecodeInstructionType.s_reg_field, reg, localFieldID, globalFieldID, offset, isPointer);
            }

            else if (instruction.type == "s_get_field_i8" || instruction.type == "s_get_field_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.s_loadf, dest, src, instruction.args[2] as number, 1);
            }
            else if (instruction.type == "s_get_field_i16" || instruction.type == "s_get_field_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.s_loadf, dest, src, instruction.args[2] as number, 2);
            }
            else if (instruction.type == "s_get_field_i32" || instruction.type == "s_get_field_u32" || instruction.type == "s_get_field_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.s_loadf, dest, src, instruction.args[2] as number, 4);
            }
            else if (instruction.type == "s_get_field_i64" || instruction.type == "s_get_field_u64" || instruction.type == "s_get_field_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.s_loadf, dest, src, instruction.args[2] as number, 8);
            }
            else if (instruction.type == "s_get_field_ptr") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.s_loadf_ptr, dest, src, instruction.args[2] as number);
            }
            else if (instruction.type == "s_set_field_i8" || instruction.type == "s_set_field_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.s_storef_reg, dest, instruction.args[1] as number, src, 1);
            }
            else if (instruction.type == "s_set_field_i16" || instruction.type == "s_set_field_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.s_storef_reg, dest, instruction.args[1] as number, src, 2);
            }
            else if (instruction.type == "s_set_field_i32" || instruction.type == "s_set_field_u32" || instruction.type == "s_set_field_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.s_storef_reg, dest, instruction.args[1] as number, src, 4);
            }
            else if (instruction.type == "s_set_field_i64" || instruction.type == "s_set_field_u64" || instruction.type == "s_set_field_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.s_storef_reg, dest, instruction.args[1] as number, src, 8);
            }
            else if (instruction.type == "s_set_field_ptr") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.s_storef_reg_ptr, dest, instruction.args[1] as number, src);
            }

            /**
             * Classes
             */

            else if (instruction.type == "c_alloc") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let num_methods = instruction.args[1] as number;
                let num_attrs = instruction.args[2] as number;

                let size_attrs = instruction.args[3] as number;
                let classID = instruction.args[4] as number;
                this.emit(BytecodeInstructionType.c_alloc, dest, num_methods, num_attrs,size_attrs, classID);
            }
            else if (instruction.type == "c_alloc_t") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let templateID = instruction.args[1] as number;
                this.emit(BytecodeInstructionType.c_alloc_t, dest, templateID);
            }
            else if (instruction.type == "c_reg_field") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let idx = instruction.args[1] as number;
                let offset = instruction.args[2] as number;
                let isPointer = instruction.args[3] as number;
                this.emit(BytecodeInstructionType.c_reg_field, dest, idx, offset, isPointer);
            }
            else if (instruction.type == "c_store_m") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let lbl = this.emit(BytecodeInstructionType.c_storem, dest, instruction.args[1] as number, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, lbl);
            }
            else if (instruction.type == "c_load_m") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.c_loadm, dest, reg, instruction.args[2] as number);
            }
            else if (instruction.type == "c_get_field_i8" || instruction.type == "c_get_field_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[1] as string);

                this.emit(BytecodeInstructionType.c_loadf, dest, reg, instruction.args[2] as number, 1);
            }
            else if (instruction.type == "c_get_field_i16" || instruction.type == "c_get_field_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[1] as string);

                this.emit(BytecodeInstructionType.c_loadf, dest, reg, instruction.args[2] as number, 2);
            }
            else if (instruction.type == "c_get_field_i32" || instruction.type == "c_get_field_u32" || instruction.type == "c_get_field_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[1] as string);

                this.emit(BytecodeInstructionType.c_loadf, dest, reg, instruction.args[2] as number, 4);
            }
            else if (instruction.type == "c_get_field_i64" || instruction.type == "c_get_field_u64" || instruction.type == "c_get_field_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[1] as string);

                this.emit(BytecodeInstructionType.c_loadf, dest, reg, instruction.args[2] as number, 8);
            }
            else if (instruction.type == "c_get_field_ptr") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[1] as string);

                this.emit(BytecodeInstructionType.c_loadf_ptr, dest, reg, instruction.args[2] as number);
            }
            else if (instruction.type == "c_set_field_i8" || instruction.type == "c_set_field_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[2] as string);

                this.emit(BytecodeInstructionType.c_storef_reg, dest, instruction.args[1] as number, reg, 1);
            }
            else if (instruction.type == "c_set_field_i16" || instruction.type == "c_set_field_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[2] as string);

                this.emit(BytecodeInstructionType.c_storef_reg, dest, instruction.args[1] as number, reg, 2);
            }
            else if (instruction.type == "c_set_field_i32" || instruction.type == "c_set_field_u32" || instruction.type == "c_set_field_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[2] as string);

                this.emit(BytecodeInstructionType.c_storef_reg, dest, instruction.args[1] as number, reg, 4);
            }
            else if (instruction.type == "c_set_field_i64" || instruction.type == "c_set_field_u64" || instruction.type == "c_set_field_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[2] as string);

                this.emit(BytecodeInstructionType.c_storef_reg, dest, instruction.args[1] as number, reg, 8);
            }
            else if (instruction.type == "c_set_field_ptr") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[2] as string);

                this.emit(BytecodeInstructionType.c_storef_reg_ptr, dest, instruction.args[1] as number, reg);
            }

            else if (instruction.type == "i_is_c") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let reg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.i_is_c, dest, reg, instruction.args[2] as number);
            }
            else if (instruction.type == "i_has_m") {
                let reg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let lblId = instruction.args[2] as string;

                let offset = this.emit(BytecodeInstructionType.i_has_m, instruction.args[0] as number, reg, 0);
                this.addUnresolvedOffset(lblId, offset);
            }
            /**
             * Array Instructions
             */
            else if (instruction.type == "a_alloc") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.a_alloc, dest, instruction.args[1] as number, instruction.args[2] as number, instruction.args[3] as number);
            }
            else if (instruction.type == "a_extend") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let arg = this.getRegisterForVariable(fn, instruction.args[1] as string)
                this.emit(BytecodeInstructionType.a_extend, dest, arg);
            }
            else if (instruction.type == "a_len") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string)
                this.emit(BytecodeInstructionType.a_len, dest, src);
            }
            else if (instruction.type == "a_slice") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let start = this.getRegisterForVariable(fn, instruction.args[2] as string)
                let end = this.getRegisterForVariable(fn, instruction.args[3] as string)
                this.emit(BytecodeInstructionType.a_slice, dest, src, start, end);
            }
            else if (instruction.type == "a_insert_a") {
                let dest_offset = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let dest_array = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src_array = this.getRegisterForVariable(fn, instruction.args[2] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[3] as string)
                this.emit(BytecodeInstructionType.a_insert_a, dest_offset, dest_array, src_array, idx);
            }
            else if (instruction.type == "a_set_index_i8" || instruction.type == "a_set_index_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_storef_reg, dest, idx, src, 1);
            }
            else if (instruction.type == "a_set_index_i16" || instruction.type == "a_set_index_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_storef_reg, dest, idx, src, 2);
            }
            else if (instruction.type == "a_set_index_i32" || instruction.type == "a_set_index_u32" || instruction.type == "a_set_index_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_storef_reg, dest, idx, src, 4);
            }
            else if (instruction.type == "a_set_index_i64" || instruction.type == "a_set_index_u64" || instruction.type == "a_set_index_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_storef_reg, dest, idx, src, 8);
            }
            else if (instruction.type == "a_set_index_ptr") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_storef_reg_ptr, dest, idx, src);
            }
            else if (instruction.type == "a_get_index_i8" || instruction.type == "a_get_index_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_loadf, dest, idx, src, 1);
            }
            else if (instruction.type == "a_get_index_i16" || instruction.type == "a_get_index_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_loadf, dest, idx, src, 2);
            }
            else if (instruction.type == "a_get_index_i32" || instruction.type == "a_get_index_u32" || instruction.type == "a_get_index_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_loadf, dest, idx, src, 4);
            }
            else if (instruction.type == "a_get_index_i64" || instruction.type == "a_get_index_u64" || instruction.type == "a_get_index_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_loadf, dest, idx, src, 8);
            }
            else if (instruction.type == "a_get_index_ptr") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_loadf_ptr, dest, idx, src);
            }
            else if (instruction.type == "a_set_reverse_index_i8" || instruction.type == "a_set_reverse_index_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_rstoref_reg, dest, idx, src, 1);
            }
            else if (instruction.type == "a_set_reverse_index_i16" || instruction.type == "a_set_reverse_index_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_rstoref_reg, dest, idx, src, 2);
            }
            else if (instruction.type == "a_set_reverse_index_i32" || instruction.type == "a_set_reverse_index_u32" || instruction.type == "a_set_reverse_index_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_rstoref_reg, dest, idx, src, 4);
            }
            else if (instruction.type == "a_set_reverse_index_i64" || instruction.type == "a_set_reverse_index_u64" || instruction.type == "a_set_reverse_index_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_rstoref_reg, dest, idx, src, 8);
            }
            else if (instruction.type == "a_set_reverse_index_ptr") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_rstoref_reg_ptr, dest, idx, src);
            }
            else if (instruction.type == "a_get_reverse_index_i8" || instruction.type == "a_get_reverse_index_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_rloadf, dest, idx, src, 1);
            }
            else if (instruction.type == "a_get_reverse_index_i16" || instruction.type == "a_get_reverse_index_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_rloadf, dest, idx, src, 2);
            }
            else if (instruction.type == "a_get_reverse_index_i32" || instruction.type == "a_get_reverse_index_u32" || instruction.type == "a_get_reverse_index_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_rloadf, dest, idx, src, 4);
            }
            else if (instruction.type == "a_get_reverse_index_i64" || instruction.type == "a_get_reverse_index_u64" || instruction.type == "a_get_reverse_index_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_rloadf, dest, idx, src, 8);
            }
            else if (instruction.type == "a_get_reverse_index_ptr") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string)
                let idx = this.getRegisterForVariable(fn, instruction.args[1] as string)
                let src = this.getRegisterForVariable(fn, instruction.args[2] as string)
                this.emit(BytecodeInstructionType.a_rloadf_ptr, dest, idx, src);
            }
            /**
             * Functions
             */
            else if (instruction.type == "fn") {
                let id = instruction.args[0] as string;
                // first we write the method ID prior to the method code
                // TODO: closure support must be added here
                if (this.isClassMethod(fn)) {
                    // we have to prefix it with the method ID
                    let methodUID = InterfaceMethod.getMethodUID((fn.fn as ClassMethod).imethod);
                    this.emitCustom(methodUID, 4);
                }
                this.resolveLabel(id, this.codeSegment.writer.writePosition);
            }
            else if (instruction.type == "fn_alloc") {
                this.emit(BytecodeInstructionType.fn_alloc);
            }
            else if (instruction.type == "call") {
                //this.emit(BytecodeInstructionType.frame_precall);
                // 2 cases: 1 with return, 2 without return
                if (instruction.args.length == 1) {
                    let lbl = this.emit(BytecodeInstructionType.fn_calli, 0);
                    this.addUnresolvedOffset(instruction.args[0] as string, lbl);
                }
                else {
                    let returnReg = this.getRegisterForVariable(fn, instruction.args[0] as string);

                    let lbl = this.emit(BytecodeInstructionType.fn_calli, 0);
                    this.addUnresolvedOffset(instruction.args[1] as string, lbl);
                    // TODO: check if poiner here..., we might need to use fn_get_ret_reg_ptr
                    this.emit(BytecodeInstructionType.fn_get_ret_reg, returnReg, 255, 8);
                }
            }
            else if (instruction.type == "call_ptr") {
                //this.emit(BytecodeInstructionType.frame_precall);
                if (instruction.args.length == 1) {
                    let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                    this.emit(BytecodeInstructionType.fn_call, reg)
                }
                else {
                    let returnReg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                    let reg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                    this.emit(BytecodeInstructionType.fn_call, reg)
                    // TODO: check if poiner here...
                    this.emit(BytecodeInstructionType.fn_get_ret_reg, returnReg, 255, 8);
                }
            }
            else if (instruction.type == "closure_call") {
                //this.emit(BytecodeInstructionType.frame_precall);
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.closure_call, reg);
                this.emit(BytecodeInstructionType.closure_backup, reg);
            }
            else if (instruction.type == "ret_i8" || instruction.type == "ret_u8") {
                let i = instruction.args[1] as number
                this.emit(BytecodeInstructionType.mv_reg_reg, 255-i, this.getRegisterForVariable(fn, instruction.args[0] as string), 2);
            }
            else if (instruction.type == "ret_i16" || instruction.type == "ret_u16") {
                let i = instruction.args[1] as number
                this.emit(BytecodeInstructionType.mv_reg_reg, 255-i, this.getRegisterForVariable(fn, instruction.args[0] as string), 2);
            }
            else if (instruction.type == "ret_i32" || instruction.type == "ret_u32" || instruction.type == "ret_f32") {
                let i = instruction.args[1] as number
                this.emit(BytecodeInstructionType.mv_reg_reg, 255-i, this.getRegisterForVariable(fn, instruction.args[0] as string), 4);
            }
            else if (instruction.type == "ret_i64" || instruction.type == "ret_u64" || instruction.type == "ret_f64") {
                let i = instruction.args[1] as number
                this.emit(BytecodeInstructionType.mv_reg_reg, 255-i, this.getRegisterForVariable(fn, instruction.args[0] as string), 8);
            }
            else if (instruction.type == "ret_ptr") {
                let i = instruction.args[1] as number
                this.emit(BytecodeInstructionType.mv_reg_reg_ptr, 255-i, this.getRegisterForVariable(fn, instruction.args[0] as string));
            }
            else if (instruction.type == "ret_void") {
                this.emit(BytecodeInstructionType.fn_ret);
            }

            /**
             * Cast
             */
            else if (instruction.type == "cast_i8_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_i8_u8, dest);
            }
            else if (instruction.type == "cast_u8_i8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_u8_i8, dest);
            }
            else if (instruction.type == "cast_i16_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_i16_u16, dest);
            }
            else if (instruction.type == "cast_u16_i16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_u16_i16, dest);
            }
            else if (instruction.type == "cast_i32_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_i32_u32, dest);
            }
            else if (instruction.type == "cast_u32_i32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_u32_i32, dest);
            }
            else if (instruction.type == "cast_i64_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_i64_u64, dest);
            }
            else if (instruction.type == "cast_u64_i64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_u64_i64, dest);
            }
            else if (instruction.type == "cast_i32_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_i32_f32, dest);
            }
            else if (instruction.type == "cast_f32_i32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_f32_i32, dest);
            }
            else if (instruction.type == "cast_i64_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_i64_f64, dest);
            }
            else if (instruction.type == "cast_f64_i64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.cast_f64_i64, dest);
            }
            else if (instruction.type == "upcast_i") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.upcast_i, dest, instruction.args[1] as number, instruction.args[2] as number);
            }
            else if (instruction.type == "upcast_u") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.upcast_u, dest, instruction.args[1] as number, instruction.args[2] as number);
            }
            else if (instruction.type == "upcast_f") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.upcast_f, dest, instruction.args[1] as number, instruction.args[2] as number);
            }
            else if (instruction.type == 'dcast_i') {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.dcast_i, dest, instruction.args[1] as number, instruction.args[2] as number);
            }
            else if (instruction.type == 'dcast_u') {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.dcast_u, dest, instruction.args[1] as number, instruction.args[2] as number);
            }
            else if (instruction.type == 'dcast_f') {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.dcast_f, dest, instruction.args[1] as number, instruction.args[2] as number);
            }

            /**
             * Math/Logic
             */

            else if (instruction.type == "add_i8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.add_i8, dest, src1, src2);
            }
            else if (instruction.type == "add_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);

                this.emit(BytecodeInstructionType.add_u8, dest, src1, src2);
            }
            else if (instruction.type == "add_i16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.add_i16, dest, src1, src2);
            }
            else if (instruction.type == "add_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);

                this.emit(BytecodeInstructionType.add_u16, dest, src1, src2);
            }
            else if (instruction.type == "add_i32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.add_i32, dest, src1, src2);
            }
            else if (instruction.type == "add_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.add_u32, dest, src1, src2);
            }
            else if (instruction.type == "add_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.add_f32, dest, src1, src2);
            }
            else if (instruction.type == "add_i64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.add_i64, dest, src1, src2);
            }
            else if (instruction.type == "add_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.add_u64, dest, src1, src2);
            }
            else if (instruction.type == "add_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.add_f64, dest, src1, src2);
            }

            else if (instruction.type == "sub_i8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.sub_i8, dest, src1, src2);
            }
            else if (instruction.type == "sub_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.sub_u8, dest, src1, src2);
            }
            else if (instruction.type == "sub_i16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.sub_i16, dest, src1, src2);
            }
            else if (instruction.type == "sub_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.sub_u16, dest, src1, src2);
            }
            else if (instruction.type == "sub_i32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.sub_i32, dest, src1, src2);
            }
            else if (instruction.type == "sub_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.sub_u32, dest, src1, src2);
            }
            else if (instruction.type == "sub_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.sub_f32, dest, src1, src2);
            }
            else if (instruction.type == "sub_i64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.sub_i64, dest, src1, src2);
            }
            else if (instruction.type == "sub_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.sub_u64, dest, src1, src2);
            }
            else if (instruction.type == "sub_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.sub_f64, dest, src1, src2);
            }
            else if (instruction.type == "mul_i8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mul_i8, dest, src1, src2);
            }
            else if (instruction.type == "mul_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mul_u8, dest, src1, src2);
            }
            else if (instruction.type == "mul_i16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mul_i16, dest, src1, src2);
            }
            else if (instruction.type == "mul_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mul_u16, dest, src1, src2);
            }
            else if (instruction.type == "mul_i32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mul_i32, dest, src1, src2);
            }
            else if (instruction.type == "mul_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mul_u32, dest, src1, src2);
            }
            else if (instruction.type == "mul_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mul_f32, dest, src1, src2);
            }
            else if (instruction.type == "mul_i64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mul_i64, dest, src1, src2);
            }
            else if (instruction.type == "mul_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mul_u64, dest, src1, src2);
            }
            else if (instruction.type == "mul_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mul_f64, dest, src1, src2);
            }

            else if (instruction.type == "div_i8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.div_i8, dest, src1, src2);
            }
            else if (instruction.type == "div_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.div_u8, dest, src1, src2);
            }
            else if (instruction.type == "div_i16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.div_i16, dest, src1, src2);
            }
            else if (instruction.type == "div_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.div_u16, dest, src1, src2);
            }
            else if (instruction.type == "div_i32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.div_i32, dest, src1, src2);
            }
            else if (instruction.type == "div_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.div_u32, dest, src1, src2);
            }
            else if (instruction.type == "div_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.div_f32, dest, src1, src2);
            }
            else if (instruction.type == "div_i64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.div_i64, dest, src1, src2);
            }
            else if (instruction.type == "div_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.div_u64, dest, src1, src2);
            }
            else if (instruction.type == "div_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.div_f64, dest, src1, src2);
            }


            else if (instruction.type == "mod_i8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mod_i8, dest, src1, src2);
            }
            else if (instruction.type == "mod_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mod_u8, dest, src1, src2);
            }
            else if (instruction.type == "mod_i16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mod_i16, dest, src1, src2);
            }
            else if (instruction.type == "mod_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mod_u16, dest, src1, src2);
            }
            else if (instruction.type == "mod_i32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mod_i32, dest, src1, src2);
            }
            else if (instruction.type == "mod_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mod_u32, dest, src1, src2);
            }
            else if (instruction.type == "mod_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mod_f32, dest, src1, src2);
            }
            else if (instruction.type == "mod_i64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mod_i64, dest, src1, src2);
            }
            else if (instruction.type == "mod_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mod_u64, dest, src1, src2);
            }
            else if (instruction.type == "mod_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.mod_f64, dest, src1, src2);
            }
            else if (instruction.type == "and") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.and, dest, src1, src2);
            }
            else if (instruction.type == "or") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.or, dest, src1, src2);
            }
            else if (instruction.type == "lshift_i8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.lshift_i8, dest, src1, src2);
            }
            else if (instruction.type == "lshift_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.lshift_u8, dest, src1, src2);
            }
            else if (instruction.type == "lshift_i16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.lshift_i16, dest, src1, src2);
            }
            else if (instruction.type == "lshift_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.lshift_u16, dest, src1, src2);
            }
            else if (instruction.type == "lshift_i32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.lshift_i32, dest, src1, src2);
            }
            else if (instruction.type == "lshift_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.lshift_u32, dest, src1, src2);
            }
            else if (instruction.type == "lshift_i64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.lshift_i64, dest, src1, src2);
            }
            else if (instruction.type == "lshift_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.lshift_u64, dest, src1, src2);
            }
            else if (instruction.type == "rshift_i8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.rshift_i8, dest, src1, src2);
            }
            else if (instruction.type == "rshift_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.rshift_u8, dest, src1, src2);
            }
            else if (instruction.type == "rshift_i16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.rshift_i32, dest, src1, src2);
            }
            else if (instruction.type == "rshift_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.rshift_u16, dest, src1, src2);
            }
            else if (instruction.type == "rshift_i32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.rshift_i32, dest, src1, src2);
            }
            else if (instruction.type == "rshift_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.rshift_u32, dest, src1, src2);
            }
            else if (instruction.type == "rshift_i64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.rshift_i64, dest, src1, src2);
            }
            else if (instruction.type == "rshift_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.rshift_u64, dest, src1, src2);
            }
            else if (instruction.type == "not") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.not, dest, src);
            }
            else if (instruction.type == "band_i8" || instruction.type == "band_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.band_8, dest, src1, src2);
            }
            else if (instruction.type == "band_i16" || instruction.type == "band_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.band_16, dest, src1, src2);
            }
            else if (instruction.type == "band_i32" || instruction.type == "band_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.band_32, dest, src1, src2);
            }
            else if (instruction.type == "band_i64" || instruction.type == "band_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.band_64, dest, src1, src2);
            }
            else if (instruction.type == "bor_i8" || instruction.type == "bor_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.bor_8, dest, src1, src2);
            }
            else if (instruction.type == "bor_i16" || instruction.type == "bor_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.bor_16, dest, src1, src2);
            }
            else if (instruction.type == "bor_i32" || instruction.type == "bor_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.bor_32, dest, src1, src2);
            }
            else if (instruction.type == "bor_i64" || instruction.type == "bor_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.bor_64, dest, src1, src2);
            }
            else if (instruction.type == "bxor_i8" || instruction.type == "bxor_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.bxor_8, dest, src1, src2);
            }
            else if (instruction.type == "bxor_i16" || instruction.type == "bxor_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.bxor_16, dest, src1, src2);
            }
            else if (instruction.type == "bxor_i32" || instruction.type == "bxor_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.bxor_32, dest, src1, src2);
            }
            else if (instruction.type == "bxor_i64" || instruction.type == "bxor_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src1 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[2] as string);
                this.emit(BytecodeInstructionType.bxor_64, dest, src1, src2);
            }
            else if (instruction.type == "bnot_i8" || instruction.type == "bnot_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.bnot_8, dest, src);
            }
            else if (instruction.type == "bnot_i16" || instruction.type == "bnot_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.bnot_16, dest, src);
            }
            else if (instruction.type == "bnot_i32" || instruction.type == "bnot_u32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.bnot_32, dest, src);
            }
            else if (instruction.type == "bnot_i64" || instruction.type == "bnot_u64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.bnot_64, dest, src);
            }
            else if (instruction.type == "j") {
                let lbl = this.emit(BytecodeInstructionType.j, 0);
                this.addUnresolvedOffset(instruction.args[0] as string, lbl);
            }
            else if (instruction.type == "j_cmp_i8") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_i8, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }
            else if (instruction.type == "j_cmp_u8") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_u8, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }
            else if (instruction.type == "j_cmp_i16") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_i16, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }
            else if (instruction.type == "j_cmp_u16") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_u16, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }
            else if (instruction.type == "j_cmp_i32") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_i32, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }
            else if (instruction.type == "j_cmp_u32") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_u32, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }
            else if (instruction.type == "j_cmp_i64") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_i64, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }
            else if (instruction.type == "j_cmp_u64") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_u64, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }
            else if (instruction.type == "j_cmp_f32") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_f32, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }
            else if (instruction.type == "j_cmp_f64") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_f64, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }
            else if (instruction.type == "j_cmp_ptr") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_ptr, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }
            else if (instruction.type == "j_cmp_bool") {
                let src1 = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src2 = this.getRegisterForVariable(fn, instruction.args[1] as string);
                let label = this.emit(BytecodeInstructionType.j_cmp_bool, src1, src2, instruction.args[2] as number, 0);
                this.addUnresolvedOffset(instruction.args[3] as string, label);
            }

            else if (instruction.type == "j_eq_null_i8" || instruction.type == "j_eq_null_u8") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let label = this.emit(BytecodeInstructionType.j_eq_null_8, reg, 0);
                this.addUnresolvedOffset(instruction.args[1] as string, label);
            }

            else if (instruction.type == "j_eq_null_i16" || instruction.type == "j_eq_null_u16") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let label = this.emit(BytecodeInstructionType.j_eq_null_16, reg, 0);
                this.addUnresolvedOffset(instruction.args[1] as string, label);
            }

            else if (instruction.type == "j_eq_null_i32" || instruction.type == "j_eq_null_u32" || instruction.type == "j_eq_null_f32") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let label = this.emit(BytecodeInstructionType.j_eq_null_32, reg, 0);
                this.addUnresolvedOffset(instruction.args[1] as string, label);
            }

            else if (instruction.type == "j_eq_null_i64" || instruction.type == "j_eq_null_u64" || instruction.type == "j_eq_null_f64") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let label = this.emit(BytecodeInstructionType.j_eq_null_64, reg, 0);
                this.addUnresolvedOffset(instruction.args[1] as string, label);
            }

            else if (instruction.type == "j_eq_null_ptr") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let label = this.emit(BytecodeInstructionType.j_eq_null_ptr, reg, 0);
                this.addUnresolvedOffset(instruction.args[1] as string, label);
            }

            /**
             * FFI
             */
            else if (instruction.type == "call_ffi") {
                this.emit(BytecodeInstructionType.call_ffi, instruction.args[0] as number, instruction.args[1] as number)
            }

            /*
            * Stack
            */
            else if (instruction.type == "push_i8" || instruction.type == "push_u8") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.push, reg, 1);
            }
            else if (instruction.type == "push_i16" || instruction.type == "push_u16") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.push, reg, 2);
            }
            else if (instruction.type == "push_i32" || instruction.type == "push_u32" || instruction.type == "push_f32") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.push, reg, 4);
            }
            else if (instruction.type == "push_i64" || instruction.type == "push_u64" || instruction.type == "push_f64") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.push, reg, 8);
            }
            else if (instruction.type == "push_ptr") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.push_ptr, reg);
            }
            else if (instruction.type == "pop_i8" || instruction.type == "pop_u8") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.pop, reg, 1);
            }
            else if (instruction.type == "pop_i16" || instruction.type == "pop_u16") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.pop, reg, 2);
            }
            else if (instruction.type == "pop_i32" || instruction.type == "pop_u32" || instruction.type == "pop_f32") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.pop, reg, 4);
            }
            else if (instruction.type == "pop_i64" || instruction.type == "pop_u64" || instruction.type == "pop_f64") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.pop, reg, 8);
            }
            else if (instruction.type == "pop_ptr") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.pop_ptr, reg);
            }

            else if (instruction.type == "debug_reg") {
                let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.debug_reg, reg);
            }

            else if (instruction.type == "closure_alloc") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let argSize = instruction.args[1] as number;
                let upvaluesSize = instruction.args[2] as number;
                let targetFn = instruction.args[3] as string;

                // we need to find targetFn in the future
                let label = this.emit(BytecodeInstructionType.closure_alloc, dest, argSize,upvaluesSize, 0);
                this.addUnresolvedOffset(targetFn as string, label);
            }
            else if (instruction.type == "closure_push_env_i8" || instruction.type == "closure_push_env_u8") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let arg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.closure_push_env, dest, arg, 1);
            }
            else if (instruction.type == "closure_push_env_i16" || instruction.type == "closure_push_env_u16") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let arg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.closure_push_env, dest, arg, 2);
            }
            else if (instruction.type == "closure_push_env_i32" || instruction.type == "closure_push_env_u32" || instruction.type == "closure_push_env_f32") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let arg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.closure_push_env, dest, arg, 4);
            }
            else if (instruction.type == "closure_push_env_i64" || instruction.type == "closure_push_env_u64" || instruction.type == "closure_push_env_f64") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let arg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.closure_push_env, dest, arg, 8);
            }
            else if (instruction.type == "closure_push_env_ptr") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let arg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.closure_push_env_ptr, dest, arg);
            }

            else if (instruction.type == "coroutine_alloc") {
                // coroutine_alloc tmp, fnAddress
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let closureReg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.coroutine_alloc, dest, closureReg);
            }

            else if (instruction.type == "coroutine_fn_alloc") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.coroutine_fn_alloc, dest);
            }

            else if (instruction.type == "coroutine_get_state") {
                let dest = this.getRegisterForVariable(fn, instruction.args[0] as string);
                let src = this.getRegisterForVariable(fn, instruction.args[1] as string);
                this.emit(BytecodeInstructionType.coroutine_get_state, dest, src);
            }

            else if (instruction.type == "coroutine_call") {
                //let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                //this.emit(BytecodeInstructionType.coroutine_call, reg);
                //this.emit(BytecodeInstructionType.frame_precall);
                // 2 cases: 1 with return, 2 without return
                if (instruction.args.length == 1) {
                    let reg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                    this.emit(BytecodeInstructionType.coroutine_call, reg);
                }
                else {
                    let returnReg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                    let coroutineReg = this.getRegisterForVariable(fn, instruction.args[1] as string);
                    this.emit(BytecodeInstructionType.coroutine_call, coroutineReg);
                    this.emit(BytecodeInstructionType.fn_get_ret_reg, returnReg, 255, 8);
                }
            }

            else if (instruction.type == "coroutine_yield") {
                this.emit(BytecodeInstructionType.coroutine_yield);
            }

            else if (instruction.type == "coroutine_ret") {
                this.emit(BytecodeInstructionType.coroutine_ret);
            }

            else if (instruction.type == "coroutine_reset") {
                this.emit(BytecodeInstructionType.coroutine_reset, instruction.args[0] as number);
            }

            else if (instruction.type == "coroutine_finish") {
                this.emit(BytecodeInstructionType.coroutine_finish, instruction.args[0] as number);
            }

            else if (instruction.type == "throw_rt") {
                this.emit(BytecodeInstructionType.throw_rt, instruction.args[0] as number);
            }

            else if (instruction.type == "throw_user_rt") {
                let messageReg = this.getRegisterForVariable(fn, instruction.args[0] as string);
                this.emit(BytecodeInstructionType.throw_user_rt, messageReg);
            }



            else {
                throw new Error("Unknown instruction: " + instruction.type);
            }
            // misc
        }
    }

    encodeProgram() {
        let constantSegmentSize = this.constantSegment.byteSize;
        let globalSegmentSize = this.globalSegment.byteSize;
        let templateSegmentSize = this.templateSegment.getByteSize();
        let codeSegmentSize = this.codeSegment.getByteSize();
        let objectKeysSegmentSize = this.objectKeysSegment.getByteSize();
        //console.log(`Program size:\n\tConstants: ${constantSegmentSize}b\n\tGlobals: ${globalSegmentSize}b\n\tTemplates:${templateSegmentSize}b\n\tCode: ${codeSegmentSize}b`);

        let constantBuffer = this.constantSegment.serialize();
        let globalBuffer = this.globalSegment.serialize();
        let templateBuffer = this.templateSegment.writer.buffer;
        let codeBuffer = this.codeSegment.writer.buffer;
        let objectKeysBuffer = this.objectKeysSegment.serialize();

        let programSize = 8 * 5 + constantSegmentSize + globalSegmentSize + templateSegmentSize + objectKeysSegmentSize + codeSegmentSize;
        let programBuffer = Buffer.alloc(programSize);
        let offset = 0;
        // write constant segment position
        programBuffer.writeBigUInt64LE(BigInt(40), offset);
        offset += 8;
        // write global segment position
        programBuffer.writeBigUInt64LE(BigInt(40 + constantSegmentSize), offset);
        offset += 8;
        // write template segment position
        programBuffer.writeBigUInt64LE(BigInt(40 + constantSegmentSize + globalSegmentSize), offset);
        offset += 8;
        // write object keys segment position
        programBuffer.writeBigUInt64LE(BigInt(40 + constantSegmentSize + globalSegmentSize + templateSegmentSize), offset);
        offset += 8;    
        // write code segment position
        programBuffer.writeBigUInt64LE(BigInt(40 + constantSegmentSize + globalSegmentSize + templateSegmentSize + objectKeysSegmentSize), offset);
        offset += 8;

        // Copy the constant segment data
        let constantSegmentBuffer = Buffer.from(constantBuffer);
        constantSegmentBuffer.copy(programBuffer, 40, 0, constantSegmentBuffer.length);

        // Copy the global segment data
        let globalSegmentBuffer = Buffer.from(globalBuffer);
        globalSegmentBuffer.copy(programBuffer, 40 + constantSegmentSize, 0, globalSegmentBuffer.length);

        // Copy the template segment data
        let templateSegmentBuffer = Buffer.from(templateBuffer);
        templateSegmentBuffer.copy(programBuffer, 40 + constantSegmentSize + globalSegmentSize, 0, templateSegmentSize);

        // Copy the object keys segment data
        let objectKeysSegmentBuffer = Buffer.from(objectKeysBuffer);
        objectKeysSegmentBuffer.copy(programBuffer, 40 + constantSegmentSize + globalSegmentSize + templateSegmentSize, 0, objectKeysSegmentBuffer.length);

        // Copy the code segment data
        let codeSegmentBuffer = Buffer.from(codeBuffer);
        codeSegmentBuffer.copy(programBuffer, 40 + constantSegmentSize + globalSegmentSize + templateSegmentSize + objectKeysSegmentSize, 0, codeSegmentBuffer.length);


        return programBuffer;
    }

    generateSourceMap(output: string) {
        let fs = require("fs");
        let content = convertToLineMappedText(this.codeSegmentSrcMap)
        fs.writeFileSync(output, content);
    }
}

function formatInstructions(code: any): string {
    // @ts-ignore
    return code.map(instruction => {
        const instructionNumber = Object.keys(instruction)[0];
        const instructionArgs = instruction[instructionNumber];
        // @ts-ignore
        const argsString = instructionArgs.map(arg => typeof arg === 'string' ? `"${arg}"` : arg).join(', ');
        return `${instructionNumber}: [${argsString}]`;
    }).join('\n');
}
