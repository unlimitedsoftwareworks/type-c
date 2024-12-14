
/**
 * Register allocator job is to replace 
 * temporary registers with real registers.
 */

import { IRInstruction } from "./bytecode/IR";
import { FunctionCodegenProps } from "./FunctionCodegenProps";

// RegisterAllocator class with live range and graph coloring functionality
export class RegisterAllocator {
    private static GENERAL_REGISTERS = 256;
    private registerUsage: boolean[] = Array(RegisterAllocator.GENERAL_REGISTERS).fill(false);

    // number of registers reserverd for argument passing, same number as the number of arguments
    private reservedRegistersCount: number = 0;
    private arguments: string[] = [];
    private locals: string[] = [];
    private instructions: IRInstruction[] = [];

    /**
     * Predefined VRegs are the bare minimum registers that are required to be allocated,
     * they are the arguments and local variables.
     */
    private predefinedVRegs: Map<string, number> = new Map();

    /**
     * Maps all tmps to their virtual registers
     */
    private tmpVRegs: Map<string, number> = new Map();
    private vregCount = 0;

    private argVRegs: number[] = [];
    private localVRegs: number[] = [];

    private interferenceGraph: Map<number, Set<number>> = new Map();
    /**
     * Maps the usage of all virtual registers, to which instructions they are used in
     */
    private registerInstructionsMap: Map<number, number[]> = new Map();

    /**
     * Labels and jump map: Maps jumps to their target instructions
     */
    private jumpTargets: Map<string, number> = new Map();
    private labels: Map<string, number> = new Map();


    // some vregs are blank, they are just not used at all
    // this happens when a tmp is assigned a vreg but it later on used as a variable
    private blankVRegs: number[] = [];


    constructor(private fn: FunctionCodegenProps) {
        // for now, args registers will be forever occupied
        for (const [key, arg] of fn.argSymbols) {
            this.arguments.push(key);
            this.predefinedVRegs.set(key, this.vregCount++);
            this.reservedRegistersCount++;
        }

        // Initialize upvalues, as args, since they are set by the env as registers when the function is called
        for (const [key, upvalue] of fn.upvalues) {
            this.arguments.push(key);
            this.predefinedVRegs.set(key, this.vregCount++);
            this.reservedRegistersCount++;
        }

        // for now, local variables registers will be forever occupied
        for (const [key, local] of fn.localSymbols) {
            this.locals.push(key);
            this.predefinedVRegs.set(key, this.vregCount++);
        }

    }

    // checks if a tmp is linked to a predefined vreg
    isLinkedToPredefinedVReg(tmp: string) {
        let vreg = this.tmpVRegs.get(tmp);
        if (vreg === undefined) {
            return false;
        }
        if(this.predefinedVRegs.has(tmp)) {
            return true;
        }
    }

    /**
     * A temporary that is created from an argument, inherits the argument's virtual register
     * @param tmp 
     * @param uid 
     */
    linkTmpToArgument(tmp: string, uid: string) {
        let vreg = this.predefinedVRegs.get(uid);
        if (vreg === undefined) {
            throw new Error("Argument register not found");
        }

        let prevReg = this.tmpVRegs.get(tmp);
        if (prevReg !== undefined) {
            // check if tmp is linked to an argument, if so we prioritize the argument
            if(this.argVRegs.includes(prevReg)) {
                this.tmpVRegs.set(tmp, prevReg);
                return;
            }

            // if it is linked to a local variable, we prioritize the other local variable
            if(this.localVRegs.includes(prevReg)) {
                this.tmpVRegs.set(tmp, prevReg);
                return;
            }

            // find the argument which points to prevReg and update it to point to vreg too
            for(const [arg, reg] of this.tmpVRegs) {
                if(reg === prevReg) {
                    this.tmpVRegs.set(arg, vreg);
                }
            }
            // inherit the usage of the previous register
            let instructions = this.registerInstructionsMap.get(prevReg) || [];
            let otherInstructions = this.registerInstructionsMap.get(vreg) || [];
            instructions = instructions.concat(otherInstructions);
            this.registerInstructionsMap.set(vreg, instructions);            
        }

        this.tmpVRegs.set(tmp, vreg);
        this.argVRegs.push(vreg);


        if(this.isRegUnused(prevReg)) {
            this.blankVRegs.push(prevReg!);
        }
    }

    /**
     * A temporary that is created from a local variable, inherits the local variable's virtual register
     * @param tmp 
     * @param uid 
     */
    linkTmpToLocal(tmp: string, uid: string) {
        let vreg = this.predefinedVRegs.get(uid);
        if (vreg === undefined) {
            throw new Error("Local variable register not found");
        }

        let prevReg = this.tmpVRegs.get(tmp);
        if (prevReg !== undefined) {
            // check if tmp is linked to an argument, if so we prioritize the argument
            if(this.argVRegs.includes(prevReg)) {
                this.tmpVRegs.set(tmp, prevReg);
                return;
            }

            // if it is linked to a local variable, we prioritize the other local variable
            if(this.localVRegs.includes(prevReg)) {
                this.tmpVRegs.set(tmp, prevReg);
                return;
            }


            // inherit the usage of the previous register
            let instructions = this.registerInstructionsMap.get(prevReg) || [];
            let otherInstructions = this.registerInstructionsMap.get(vreg) || [];
            instructions = instructions.concat(otherInstructions);
            this.registerInstructionsMap.set(vreg, instructions);            
        }

        this.tmpVRegs.set(tmp, vreg);
        this.localVRegs.push(vreg);

        if(this.isRegUnused(prevReg)) {
            this.blankVRegs.push(prevReg!);
        }
    }

    /**
     * A temporary that is created from another temporary, inherits the other temporary's virtual register
     * @param tmp 
     * @param uid 
     */
    linkTmpToTmp(tmp: string, uid: string) {
        let vreg = this.tmpVRegs.get(uid);
        if (vreg === undefined) {
            throw new Error("Tmp register not found");
        }

        let prevReg = this.tmpVRegs.get(tmp);
        if (prevReg !== undefined) {
            // check if tmp is linked to an argument, if so we prioritize the argument
            if(this.argVRegs.includes(prevReg)) {
                this.tmpVRegs.set(tmp, prevReg);
                return;
            }

            // if it is linked to a local variable, we prioritize the other local variable
            if(this.localVRegs.includes(prevReg)) {
                this.tmpVRegs.set(tmp, prevReg);
                return;
            }

            // inherit the usage of the previous register
            let instructions = this.registerInstructionsMap.get(prevReg) || [];
            let otherInstructions = this.registerInstructionsMap.get(vreg) || [];
            instructions = instructions.concat(otherInstructions);
            this.registerInstructionsMap.set(vreg, instructions);            
        }

        this.tmpVRegs.set(tmp, vreg);

        if(this.isRegUnused(prevReg)) {
            this.blankVRegs.push(prevReg!);
        }
    }

    /**
     * A temporary that is created from an upvalue, inherits the upvalue's virtual register
     * @param tmp 
     * @param uid 
     */
    linkTmpToUpvalue(tmp: string, uid: string) {
        let vreg = this.predefinedVRegs.get(uid);
        if (vreg === undefined) {
            throw new Error("Upvalue register not found");
        }

        let prevReg = this.tmpVRegs.get(tmp);
        if (prevReg !== undefined) {
            // Prioritize the upvalue if already linked
            if (this.argVRegs.includes(prevReg) || this.localVRegs.includes(prevReg)) {
                this.tmpVRegs.set(tmp, prevReg);
                return;
            }

            // Inherit the usage of the previous register
            let instructions = this.registerInstructionsMap.get(prevReg) || [];
            let otherInstructions = this.registerInstructionsMap.get(vreg) || [];
            instructions = instructions.concat(otherInstructions);
            this.registerInstructionsMap.set(vreg, instructions);
        }

        this.tmpVRegs.set(tmp, vreg);
        this.argVRegs.push(vreg);

        if (this.isRegUnused(prevReg)) {
            this.blankVRegs.push(prevReg!);
        }
    }

    /**
     * A temporary that does not inherit any virtual register, must have a new virtual register
     * @param tmp
     */
    linkTmpToNewVReg(tmp: string) {
        // make sure it doesn't already have a vreg
        let vreg = this.tmpVRegs.get(tmp);
        if (vreg === undefined) {
            this.tmpVRegs.set(tmp, this.vregCount++);
        }
    }

    /**
     * Checks if a virtual register is unused
     * @param vreg 
     */
    isRegUnused(vreg?: number) {
        if(vreg === undefined) {
            return false;
        }

        // check tmpVRegs for the vreg
        for (const [tmp, reg] of this.tmpVRegs) {
            if (reg === vreg) {
                return false;
            }
        }

        return true;
    }

    processJump(id: string, instruction: number) {
        this.jumpTargets.set(id, instruction);

        if(this.labels.has(id)) {
            let instruction = this.labels.get(id)!;
            // mark any virtual registers used at or after the instruction as used
            for(const [vreg, instructions] of this.registerInstructionsMap) {
                if(instructions.reduce((a, b) => a || (b >= instruction), false)) {
                    this.markVRegAtInstruction(vreg, instruction);
                }
            }
        }
    }

    processLabel(id: string, instruction: number) {
        this.labels.set(id, instruction);
    }

    markVRegAtInstruction(vreg: number, instruction: number) {
        let instructions = this.registerInstructionsMap.get(vreg);
        if (instructions === undefined) {
            instructions = [];
        }
        instructions.push(instruction);
        this.registerInstructionsMap.set(vreg, instructions);
    }

    processInstructions(instructions: IRInstruction[]) {
        let position = 0;
        let seen: string[] = [];
        this.instructions = instructions;

        // First pass: Establish live ranges
        for (const instruction of instructions) {
            if (instruction.type.startsWith("tmp_")) {
                let name = instruction.args[0] as string;
                let type = instruction.args[1] as string;
                let uid = instruction.args[2] as string;

                if (type === "arg") {
                    this.linkTmpToArgument(name, uid);
                    this.markVRegAtInstruction(this.tmpVRegs.get(name)!, position);
                    position++;
                    continue;
                }

                if (type == "local") {
                    this.linkTmpToLocal(name, uid);
                    this.markVRegAtInstruction(this.tmpVRegs.get(name)!, position);
                    position++;
                    continue;
                }

                if (type == "upvalue") {
                    this.linkTmpToUpvalue(name, uid);
                    this.markVRegAtInstruction(this.tmpVRegs.get(name)!, position);
                    position++;
                    continue;
                }

                if (type == "reg") {
                    this.linkTmpToTmp(name, uid);
                    this.markVRegAtInstruction(this.tmpVRegs.get(name)!, position);
                    position++;
                    continue;
                }

                if (type == "reg_copy") {
                    // we need to copy the register
                    // so we it counts as its own live range
                    // used for casting basic types to other basic types, temporariry, such as comparing u8 with i8, they are both upgrated to i16,
                    // because register values change overriding values in the previous types
                    // 
                    this.linkTmpToNewVReg(name);
                    this.markVRegAtInstruction(this.tmpVRegs.get(name)!, position);
                    this.markVRegAtInstruction(this.tmpVRegs.get(uid)!, position);
                    position++;
                    continue;
                }
            }



            if(instruction.type === "j") {
                let id = instruction.args[0] as string;
                this.processJump(id, position);
            }
            else if (instruction.type.startsWith("j_cmp_")) {
                let id = instruction.args[3] as string;
                this.processJump(id, position);
            }
            else if (instruction.type.startsWith("j_eq_null_")) {
                let id = instruction.args[1] as string;
                this.processJump(id, position);
            }
            else if (instruction.type == "label") {
                let id = instruction.args[0] as string;
                this.processLabel(id, position);
            }
            // special case: const str declares two regs
            else if (instruction.type === "destroy_tmp") {
                //this.endLiveRange(instruction.args[0] as string, position);
                this.markVRegAtInstruction(this.tmpVRegs.get(instruction.args[0] as string)!, position);
            }
            
            if (instruction.args.length > 0) {
                for (const arg of instruction.args) {
                    if ((typeof arg === "string") && arg.startsWith("tmp_")) {
                        if (!seen.includes(arg)) {
                            this.linkTmpToNewVReg(arg);
                            seen.push(arg);
                        }
                        this.markVRegAtInstruction(this.tmpVRegs.get(arg)!, position);
                    }
                }
            }

            position++;
        }
    }

    buildInterferenceGraph() {
        let graph: Map<number, number[]> = new Map();
        this.interferenceGraph = new Map();
        for (let i = 0; i < this.vregCount; i++) {
            if(this.blankVRegs.includes(i)) {
                continue;
            }

            // get the range of this vreg
            let range = this.registerInstructionsMap.get(i)!;
            if (range == null) {
                continue;
            }

            // find min and max
            let range_sorted = range.sort((a, b) => a - b)
            let min = range_sorted[0];

            // if argument, min is 0, we do not add to the live range but we compute in inference!
            // IMPORTANT
            if ((i < this.arguments.length) && this.predefinedVRegs.has(this.arguments[i])) {
                min = 0;
            }

            let max = range_sorted[range_sorted.length - 1];

            graph.set(i, [min, max]);
        }

        // now we have a graph of all vregs and their ranges
        for (const [vreg, range] of graph) {
            // check all other vregs
            for (const [otherVreg, otherRange] of graph) {
                // if the ranges intersect
                if ((range[0] <= otherRange[1]) && (range[1] >= otherRange[0])) {
                    // add an edge
                    let edges = this.interferenceGraph.get(vreg);
                    if (edges == null) {
                        edges = new Set();
                    }
                    edges.add(otherVreg);
                    this.interferenceGraph.set(vreg, edges);
                }
            }
        }

        //console.log(this.interferenceGraph);
    }


    colorGraph(): Map<number, number> {
        let coloring: Map<number, number> = new Map();
    
        this.buildInterferenceGraph();
        while (true) {
            for (const [vreg, neighbors] of this.interferenceGraph) {
                
                // IMPORTANT!
                if((vreg < this.arguments.length) && (this.predefinedVRegs.has(this.arguments[vreg]))) {
                    coloring.set(vreg, vreg);
                    continue;
                }
    
                // Initialize the set of available colors, excluding argument registers
                const availableColors = new Set(Array.from({ length: RegisterAllocator.GENERAL_REGISTERS }, (_, i) => i));
                this.excludeArgumentRegisters(availableColors);
    
                neighbors.forEach(neighbor => {
                    const color = coloring.get(neighbor);
                    if (color !== undefined) {
                        availableColors.delete(color);
                    }
                });
    
                if (availableColors.size === 0) {
                    throw new Error("function too complex");
                    coloring.clear(); // Clear the coloring and retry
                    break;
                } else {
                    let v = availableColors.values().next().value
                    if(v === undefined) {
                        throw new Error("No available color");
                    }
                    coloring.set(vreg, v);
                }
            }
    
            if (coloring.size === this.interferenceGraph.size) {
                break; // Successfully colored
            }
    
            this.buildInterferenceGraph();
        }
    
        return coloring;
    }
    
    excludeArgumentRegisters(availableColors: Set<number>) {
        // Assuming you have a way to get the physical registers used for arguments
        this.arguments.forEach((_, i) => {
            availableColors.delete(i);
        });
    }

    updateColoringToTmps(coloring: Map<number, number>) {
        let tmpColoring: Map<string, number> = new Map();

        for(const [tmp, vreg] of this.tmpVRegs) {
            let color = coloring.get(vreg);
            if(color === undefined) {
                continue;
            }
            tmpColoring.set(tmp, color);
        }


        //console.log(tmpColoring);

        return {coloring: tmpColoring};
    }

    getInstructions() {
        return this.instructions;
    }
}

// Function to perform register allocation
export function allocateRegisters(fn: FunctionCodegenProps, instructions: IRInstruction[]) {
    const allocator = new RegisterAllocator(fn);

    allocator.processInstructions(instructions);
    // Build and color the interference graph
    const registerAssignments = allocator.colorGraph();
    instructions = allocator.getInstructions();
    
    return {...allocator.updateColoringToTmps(registerAssignments), instructions: instructions};
}