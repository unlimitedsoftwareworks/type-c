/**
 * Filename: DataWriter.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 * 
 * Description:
 *     Writes bytecode instructions to a buffer
 * 
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

export class DataWriter {
    buffer: Buffer;
    writePosition: number;

    constructor(initialSize: number = 1024) {
        this.buffer = Buffer.alloc(initialSize);
        this.writePosition = 0;
    }

    ensureCapacity(additionalSize: number) {
        const availableSpace = this.buffer.length - this.writePosition;
        if (availableSpace < additionalSize) {
            const newSize = this.buffer.length + Math.max(additionalSize, this.buffer.length);
            const newBuffer = Buffer.alloc(newSize);
            this.buffer.copy(newBuffer);
            this.buffer = newBuffer;
        }
    }

    push_8(value: number) {
        this.ensureCapacity(1);
        this.buffer.writeUInt8(value, this.writePosition);
        this.writePosition += 1;

        return this.writePosition - 1;
    }

    push_16(value: number, littleEndian: boolean = true) {
        this.ensureCapacity(2);
        if (littleEndian) {
            this.buffer.writeUInt16LE(value, this.writePosition);
        } else {
            this.buffer.writeUInt16BE(value, this.writePosition);
        }
        this.writePosition += 2;

        return this.writePosition - 2;
    }

    push_32(value: number, littleEndian: boolean = true) {
        this.ensureCapacity(4);
        if (littleEndian) {
            this.buffer.writeUInt32LE(value, this.writePosition);
        } else {
            this.buffer.writeUInt32BE(value, this.writePosition);
        }
        this.writePosition += 4;

        return this.writePosition
    }


    push_64(value: number, littleEndian: boolean = true) {
        let v = BigInt(value);
        this.ensureCapacity(8);
        if (littleEndian) {
            this.buffer.writeBigUint64LE(v, this.writePosition);
        } else {
            this.buffer.writeBigUint64BE(v, this.writePosition);
        }
        this.writePosition += 8;

        return this.writePosition - 8;
    }

    push_bytesNeeded(value: number): number {
        if (value < 0) {
            throw new Error("Value must be non-negative");
        }

        // Determine the number of bytes needed to represent the value
        const bytesNeeded = this.calculateBytesNeeded(value);

        // Push the size (number of bytes needed)
        this.push_8(bytesNeeded);

        // Push the number with the required bytes
        switch (bytesNeeded) {
            case 1:
                return this.push_8(value);
            case 2:
                return this.push_16(value);
            case 4:
                return this.push_32(value);
            case 8:
                return this.push_64(value);
            default:
                throw new Error("Unsupported byte size");
        }

        throw new Error("Unreachable");
    }

    private calculateBytesNeeded(value: number): number {
        if (value < 0x100) return 1; // Fits in 1 byte
        if (value < 0x10000) return 2; // Fits in 2 bytes
        if (value < 0x100000000) return 4; // Fits in 4 bytes
        return 8; // Needs 8 bytes
    }

    overwriteAt(index: number, value: number, byteSize: number, littleEndian: boolean = true) {
        let v = BigInt(value);
        if (index < 0 || index >= this.buffer.length) {
            throw new Error("Index out of bounds");
        }
        switch (byteSize) {
            case 1:
                this.buffer.writeUInt8(value, index);
                break;
            case 2:
                if (littleEndian) {
                    this.buffer.writeUInt16LE(value, index);
                } else {
                    this.buffer.writeUInt16BE(value, index);
                }
                break;
            case 4:
                if (littleEndian) {
                    this.buffer.writeUInt32LE(value, index);
                } else {
                    this.buffer.writeUInt32BE(value, index);
                }
                break;
            case 8:
                if (littleEndian) {
                    this.buffer.writeBigUint64LE(v, index);
                } else {
                    this.buffer.writeBigUint64BE(v, index);
                }
                break;
            default:
                throw new Error("Invalid byte size");
        }
    }

    getBuffer(): Buffer {
        return this.buffer.slice(0, this.writePosition);
    }
}
