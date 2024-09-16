
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

    private spilledVRegs: number[] = [];

    private spillingIRInstructions: { i: IRInstruction, idx: number }[] = [];

    // map from vreg to an incremented spill id
    private spillIdMap: Map<number, number> = new Map();
    private spillId = 0;

    // some vregs are blank, they are just not used at all
    // this happens when a tmp is assigned a vreg but it later on used as a variable
    private blankVRegs: number[] = [];

    spillID(vreg: number) {
        let id = this.spillIdMap.get(vreg);
        if (id === undefined) {
            this.spillIdMap.set(vreg, this.spillId++);
            return this.spillId - 1;
        }
        return id!;
    }

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
            }



            if(instruction.type === "j") {
                let id = instruction.args[0] as string;
                this.processJump(id, position);
            }
            else if (instruction.type.startsWith("j_cmp_")) {
                let id = instruction.args[3] as string;
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
                    if (typeof arg === "string") {
                        if (!seen.includes(arg) && arg.startsWith("tmp_")) {
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

            if (this.spilledVRegs.includes(i)) {
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
    }


    // Adds IR instructions to spill the physical register into the memory allocated for spilled vreg
    insertSpillCode(vreg: number, physRegister: number, instruction: number) {
        let spillID = this.spillID(vreg)
        this.spillingIRInstructions.push({ i: new IRInstruction("spill", [spillID, physRegister]), idx: instruction});
    }

    // Adds IR instructions to unspill from the memory allocated for spilled vreg into the physical register
    insertUnspillCode(vreg: number, instruction: number) {
        // Choose a physical register for unspilling
        let physRegister = this.choosePhysRegisterForUnspill(vreg);
        let spillID = this.spillID(vreg)
        this.spillingIRInstructions.push({ i: new IRInstruction("unspill", [physRegister, spillID]), idx: instruction});
        return physRegister;
    }

    choosePhysRegisterForUnspill(vreg: number): number {
        // Check for a free physical register
        for (let i = 0; i < RegisterAllocator.GENERAL_REGISTERS; i++) {
            if (!this.registerUsage[i]) {
                this.registerUsage[i] = true; // Mark the register as used
                return i; // Return the free register
            }
        }

        // If no free register is available, choose a register to spill
        for (let i = 0; i < RegisterAllocator.GENERAL_REGISTERS; i++) {
            if (this.canSpillRegister(i)) {
                this.spillRegister(i); // Implement this method to handle the spilling
                return i; // Reuse the spilled register
            }
        }

        throw new Error("No available registers for unspilling");
    }

    canSpillRegister(physRegister: number): boolean {
        // Implement logic to determine if a physical register can be spilled
        // For simplicity, this might just return true, but more complex logic could be used
        // ...
        return true;
    }



    spillRegister(vreg: number) {
        this.spilledVRegs.push(vreg);

        // check if the register is an argument
        let isArg = false;
        if (this.argVRegs.includes(vreg)){
            isArg = true;
        }

        if (isArg) {
            // insert spill code at the top of the function
            this.insertSpillCode(vreg, vreg, 0);
        }

        let usagesInterval: number[][] = [];
        // turn the usages into intervals, when the register is used in an uninterruptable block, it is considered used for the entire block
        let usages = this.registerInstructionsMap.get(vreg)!;
        let start = 0;
        let end = 0;
        for (let i = 0; i < usages.length; i++) {
            if (i === 0) {
                start = usages[i];
                end = usages[i];
                continue;
            }

            if (usages[i] === usages[i - 1] + 1) {
                end = usages[i];
            }
            else {
                usagesInterval.push([start, end]);
                start = usages[i];
                end = usages[i];
            }
        }

        // add the last interval if it doesnt exist
        if((usagesInterval.length > 0 ) && (start !== usagesInterval[usagesInterval.length - 1][0]) || (usagesInterval.length === 0)) {
            usagesInterval.push([start, end]);
        }

        // now we have a list of intervals, we can start inserting unspill code before the interval and spill code after the interval
        for (const interval of usagesInterval) {
            // insert unspill code before
            let preg = this.insertUnspillCode(vreg, interval[0]); // do we need -1?

            // insert spill code after
            this.insertSpillCode(vreg, preg, interval[1]+1); // do we need +1?
        }

        //this.registerInstructionsMap.delete(vreg);
    }

    colorGraph(): Map<number, number> {
        let coloring: Map<number, number> = new Map();
        let toSpill: number[] = [];
    
        this.buildInterferenceGraph();
        while (true) {
            for (const [vreg, neighbors] of this.interferenceGraph) {
                if (toSpill.includes(vreg)) {
                    continue; // Skip already spilled vregs
                }

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
                    toSpill.push(vreg); // No available color, mark for spilling
                    coloring.clear(); // Clear the coloring and retry
                    break;
                } else {
                    coloring.set(vreg, availableColors.values().next().value);
                }
            }
    
            if (coloring.size === this.interferenceGraph.size - toSpill.length) {
                break; // Successfully colored
            }
    
            // Spill logic
            for (const vreg of toSpill) {
                this.spillRegister(vreg);
            }
            toSpill = [];
    
            // Rebuild your interference graph here without the spilled vregs
            this.buildInterferenceGraph();
        }
    
        return coloring;
    }
    
    excludeArgumentRegisters(availableColors: Set<number>) {
        // Assuming you have a way to get the physical registers used for arguments
        this.arguments.forEach((_, i) => {
            if(!this.spilledVRegs.includes(i)) {
                availableColors.delete(i);
                //this.predefinedVRegs.delete(this.arguments[i]);
            }
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

        // map from tmp to spill id
        let spills: Map<string, number> = new Map();
        for(const [tmp, vreg] of this.tmpVRegs) {
            if(this.spilledVRegs.includes(vreg)) {
                spills.set(tmp, this.spillID(vreg));
            }
        }


        return {coloring: tmpColoring, spills: spills};
    }

    updateIRInstructions() {
        if (this.spillingIRInstructions.length === 0) {
            return this.instructions;
        }


        // if head instruction is fn, remove it temporarily
        let head = this.instructions[0];
        let isFn = head.type === "fn"; 

        
        // Sort the spilling instructions by their original index
        this.spillingIRInstructions.sort((a, b) => a.idx - b.idx);
        
        // Create an array to hold the final set of instructions
        let updatedInstructions = [];
        let currentIdx = 0; // Current index in the original instructions array
    
        for (let instr of this.spillingIRInstructions) {
            // Add instructions from the original array up to the current index
            while (currentIdx < instr.idx) {
                updatedInstructions.push(this.instructions[currentIdx]);
                currentIdx++;
            }
    
            // Insert the new instruction from spillingIRInstructions
            updatedInstructions.push(instr.i);
            
            // No need to track insertCount, as currentIdx is adjusted in the loop
        }
        
        // Add any remaining instructions from the original list
        while (currentIdx < this.instructions.length) {
            updatedInstructions.push(this.instructions[currentIdx]);
            currentIdx++;
        }
        
        let alloc_i = new IRInstruction("alloc_spill", [this.spillId]);

        if(isFn) {
            // find and remove the fn instruction
            let idx = updatedInstructions.findIndex((i) => i.type === "fn");
            updatedInstructions.splice(idx, 1);
            updatedInstructions = [head, alloc_i, ...updatedInstructions];
        }
        else {
            updatedInstructions = [alloc_i, ...updatedInstructions];
        }

        // Update the instructions array
        this.instructions = updatedInstructions;
        return this.instructions;
    }
    
}

// Function to perform register allocation
export function allocateRegisters(fn: FunctionCodegenProps, instructions: IRInstruction[]) {
    const allocator = new RegisterAllocator(fn);

    allocator.processInstructions(instructions);
    // Build and color the interference graph
    const registerAssignments = allocator.colorGraph();
    instructions = allocator.updateIRInstructions();
    
    return {...allocator.updateColoringToTmps(registerAssignments), instructions: instructions};
}