import { ClassAttribute } from "../ast/other/ClassAttribute";
import { ClassMethod } from "../ast/other/ClassMethod";
import { DeclaredVariable } from "../ast/symbol/DeclaredVariable";
import { BytecodeInstructionType } from "./BytecodeInstructions";
import { CodeSegment } from "./CodeSegment";
import { DataWriter } from "./DataWriter";
import { FunctionGenerator } from "./FunctionGenerator";
import { getDataTypeByteSize } from "./utils";

function parseCStyleNumber(cNumberString: string): number {
    // Check if the string ends with 'f' or 'F' and remove it
    if (cNumberString.endsWith('f') || cNumberString.endsWith('F')) {
        cNumberString = cNumberString.slice(0, -1);
    }

    // Parse the string as a number (float or integer, including exponent notation)
    let numberValue = parseFloat(cNumberString);

    // Check for parsing errors
    if (isNaN(numberValue)) {
        throw new Error("Invalid number format");
    }

    return numberValue;
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
                            view.setFloat32(offset, constant.floatValue as number, true); // true for little-endian
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
        if (variable instanceof DeclaredVariable) {
            this.byteSize += getDataTypeByteSize(variable.annotation!);
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
    unresolvedOffsets: Map<string, number[]> = new Map();
    resolvedOffsets: Map<string, number> = new Map();

    codeSegment: CodeSegment = new CodeSegment();

    /**
     * Spilled registers for tmp variables,
     * since unspilling can be done in any register, we track tmp spilling changes here
     */
    lastSpillRegisterForTmp: Map<string, number> = new Map();
    updateSpillSlot(fn: FunctionGenerator, id: number, reg: number){
        // find the spilled tmp variable with the id
        for(const [key, value] of fn.spills){
            if(value == id){
                this.lastSpillRegisterForTmp.set(key, reg);
            }
        }
    }

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
            //throw "Variable " + variable + " not found in register allocation";
            // we try to find it in the spilled registers
            res = this.lastSpillRegisterForTmp.get(variable);
            if (res == undefined) {
                throw "Variable " + variable + " not found in register allocation";
            }
        }

        return res;
    }

    addUnresolvedOffset(uid: string, offset: number) {
        let offsets = this.unresolvedOffsets.get(uid);
        if (!offsets) {
            offsets = [];
            this.unresolvedOffsets.set(uid, offsets);
        }

        offsets.push(offset);
    }

    emit(instruction: BytecodeInstructionType, ...args: number[]) {
        let loc = this.getActiveMapLoc();
        if (loc != null) {
            this.pushCodeLoc(loc);
        }
        return this.codeSegment.emit(instruction, ...args);
    }

    emitCustom(data: number, bytes: number | null) {
        return this.codeSegment.emitCustom(data, bytes);
    }

    /**
     * Checks if a function is a class method
     * @param fn 
     * @returns 
     */
    isClassMethod(fn: FunctionGenerator): boolean {
        return fn.fn instanceof ClassMethod;
    }

    resolveLabel(label: string, offset: number) {
        let res = this.resolvedOffsets.get(label);
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
                this.codeSegment.emitAtCustom(offset, value, 8);
            }
        }
    }


    generateBytecode(fn: FunctionGenerator) {
        //for (let i = 0; i < fn.instructions.length; i++) {}
    }

    encodeProgram() {
        
    }

    generateSourceMap(output: string) {
    }
}