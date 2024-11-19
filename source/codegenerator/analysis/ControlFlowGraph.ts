/**
 * Filename: ControlFlowGraph.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     Model the CFG of type-c IR
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { digraph, attribute as _, toDot, Node, Edge, Subgraph, EdgeAttributesObject, RootGraphModel } from 'ts-graphviz';
import { FunctionGenerator, FunctionGenType } from '../FunctionGenerator';
import { IRInstruction, IRInstructionType } from '../bytecode/IR';
import { FunctionCodegenProps } from '../FunctionCodegenProps';
import { ClassMethod } from '../../ast/other/ClassMethod';

function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

class IRNode {
    instructions: IRInstruction[];
    id: string;
    jumpTargets: string [] = []; // To store jump target labels for this node
    jumpTargetsType: ("certain" | "uncertain" ) [] = [];
    jumpTargetsLabel: string []= []; // To store the label of the jump instruction that targets this node
    maxArgs: number = 3;

    constructor(id: string) {
        this.instructions = [];
        this.id = id;
    }

    addInstruction(instr: IRInstruction) {
        if(instr.type === "srcmap_push_loc" || instr.type === "srcmap_pop_loc") return;

        //if (instr.type !== "debug") {
            this.instructions.push(instr);
            if (this.isJumpInstruction(instr.type)) {
                this.jumpTargets.push(instr.args[0] as string);
                if(instr.type === "j"){
                    this.jumpTargetsType.push("certain");
                }
                else {
                    this.jumpTargetsType.push("uncertain");
                }
                this.jumpTargetsLabel.push(instr.type + " " + instr.args[0] as string);
            }
        //}
    }

    isJumpInstruction(type: IRInstructionType): boolean {
        return ["j", "je", "jne", "jg", "jge", "jl", "jle"].includes(type);
    }

    isEmpty(): boolean {
        return this.instructions.length === 0;
    }

    toString(): string {
        return this.instructions.map(instr => instr.toString()).join('\\n');
    }
}

export class ControlFlowGraph {
    functions: FunctionGenerator[];
    cfg: Map<string, Map<string, IRNode>>;

    // block ids for each function
    blockIds: Map<string, string[]>;


    funcHeaders: Map<string, FunctionGenType> = new Map();


    constructor(fs: FunctionGenerator[]) {
        this.functions = fs;
        this.cfg = new Map<string, Map<string, IRNode>>(); // Change this line
        this.blockIds = new Map<string, string[]>();
        this.generateCFG();
    }

    generateCFG() {
        this.functions.forEach((func, funcIndex) => {
            let blocks: Map<string, IRNode> = new Map(); // Change this line
            let blockIds: string[] = [];

            let currentBlock = new IRNode(`node_${funcIndex}_0`);
            let blockIndex = 1;

            func.instructions.forEach((instr, index) => {
                currentBlock.maxArgs = Math.max(currentBlock.maxArgs, instr.args.length);
                if (instr.type === 'label' || currentBlock.isJumpInstruction(instr.type)) {
                    if (!currentBlock.isEmpty()) {
                        blocks.set(currentBlock.id, currentBlock); // Change this line
                        blockIds.push(currentBlock.id);
                    }
                    let name = instr.args[0] as string;
                    if(currentBlock.isJumpInstruction(instr.type)){
                        name = `node_${funcIndex}_${blockIndex++}`;
                    }
                    if(instr.type === 'label'){
                        currentBlock = new IRNode(name);
                    }
                }
                currentBlock.addInstruction(instr);

            });

            if (!currentBlock.isEmpty()) {
                blocks.set(currentBlock.id, currentBlock); // Change this line
                blockIds.push(currentBlock.id);
            }

            this.cfg.set(func.fn.context.uuid, blocks);
            this.blockIds.set(func.fn.context.uuid, blockIds);
            this.funcHeaders.set(func.fn.context.uuid, func.fn);
        });
}

    generateDotGraph() {
        let graphs: {name: string, graph: RootGraphModel}[] = [];

        this.cfg.forEach((blocks, funcName) => {
            let header = this.funcHeaders.get(funcName);
            const G = digraph(funcName, {[_.rankdir]: 'LR', [_.splines]: "curved", [_.ranksep]: 1, [_.nodesep]: 1, [_.concentrate]: false,});

            // @ts-ignore
            let frameName = (header?.context.pkg || "<stdin>") + "/" + ((header! instanceof ClassMethod)?(header?.context.getActiveClass()?.classId+"."):"")+(header?.context.findParentFunction()?.name || "")
            const subgraph = new Subgraph(`cluster_${funcName}`, { label: `
            <<FONT FACE="Courier"><TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0">
                <TR><TD COLSPAN="3">${frameName}</TD></TR>
                <TR><TD>JumpID: ${funcName}</TD><TD>num args: ${(header?.codeGenProps.argSymbols!.size)}</TD><TD>num locals:${(header?.codeGenProps.localSymbols!.size)}</TD></TR>
                ${Object.keys(header?.codeGenProps.stackSymbols!).map(key =>{
                    let stackElement = header?.codeGenProps.stackSymbols.get(key)!;
                    return `<TR><TD>ID: ${stackElement?.sym.uid}</TD><TD>Size: ${stackElement?.byteSize}[b]</TD><TD>Offset: ${stackElement?.offset}</TD></TR>`
                }).join('\n')}
                </TABLE></FONT>>
            `, rank: 'min' });

            let prevNode: Node | null = null;
            let prevNodeIsJump = false;
            blocks.forEach((block, index) => {
                let jmp_counter = 0;
                const umlLabel = `
                    <<FONT FACE="Courier"><TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0">
                    <TR>
                        <TD BGCOLOR="lightblue" PORT="header_${block.instructions[0].type}_${block.instructions[0].args[0]}"><B>${block.instructions[0].type}</B></TD>
                        ${block.instructions[0].args.map((arg, i) => {
                            if( i == 2) {
                                return `<TD PORT="header_${block.instructions[0].type}_${block.instructions[0].args[0]}_UP">${arg}</TD>`
                            }
                            return `<TD>${arg}</TD>`
                        })}
                        ${/* add remaining empty cells */ (2 - block.instructions[0].args.length).toString().split('').map(() => `<TD></TD>`).join('\n')}
                        ${(block.instructions[0].args.length < block.maxArgs) && (`<TD PORT="header_${block.instructions[0].type}_${block.instructions[0].args[0]}_UP"></TD>`)}
                    </TR>
                    ${block.instructions.map((instr, i) => {
                        if(i === 0) return '';
                        if(instr.type === "debug") return `<TR><TD COLSPAN="${1+block.maxArgs}" BGCOLOR="lightgrey">${escapeHtml(instr.args[0] +"")}</TD></TR>`;

                        if(block.isJumpInstruction(instr.type)){
                            let data =  `<TR>
                                <TD BGCOLOR="turquoise" PORT="${block.instructions[0]}_${jmp_counter}"><B>${instr.type}</B></TD>

                                <TD COLSPAN="${block.maxArgs}" PORT="${block.instructions[0]}_${jmp_counter}_UP">${instr.args[0]}</TD>

                            </TR>`;
                            jmp_counter++;
                            return data;
                        }
                        return `<TR>
                            <TD><B>${instr.type}</B></TD>
                            ${instr.args.map((arg) => {
                                return `<TD>${arg}</TD>`
                            })}
                            ${(Array.from(new Array(block.maxArgs - instr.args.length).keys())).map(() => `<TD> </TD>`).join('')}
                        </TR>`
                    }).join('\n')}
                    </TABLE></FONT>>
                `;

                const node = new Node(block.id, {
                    label: umlLabel,
                    shape: 'plaintext',
                });
                subgraph.addNode(node);

                // Sequentially link this node to the previous one

                // If this block is a jump, create an edge to the jump target
                if (block.jumpTargets.length > 0) {
                    // check if we are moving up or down
                    // find the target block
                    for (let i = 0; i < block.jumpTargets.length; i++) {
                        let blockIds = this.blockIds.get(funcName) as string[];
                        let currentBlockIndex = blockIds.indexOf(block.id);
                        let targetBlockIndex = blockIds.indexOf(block.jumpTargets[i]);

                        let goingDown = currentBlockIndex < targetBlockIndex;

                        const targetBlock = blocks.get(block.jumpTargets[i]);
                        if (targetBlock !== undefined) {
                            // check if the jump target is certain
                            let props: EdgeAttributesObject = {constraint: false, dir: (goingDown ? "forward" : "back"), style: 'solid'};

                            if (block.jumpTargetsType[i] === "certain") {
                                props= { ...props, label: block.jumpTargetsLabel[i] || "" }
                            } else {
                                // add semi transparent edge from this node to the jump target
                                props = { ...props, color: '#ff0000ff', label: block.jumpTargetsLabel[i] || "" }
                            }
                            subgraph.addEdge(
                                    new Edge([
                                        {
                                            id: `${node.id}`,
                                            port: `${block.instructions[0]}_${i}${goingDown?"_UP":""}`,
                                            compass: goingDown ? 'e' : 'w'
                                        },
                                        {
                                            id: `${targetBlock.id}`,
                                            port: `header_${targetBlock.instructions[0].type}_${targetBlock.instructions[0].args[0]}${goingDown?"":"UP"}`,
                                            compass: goingDown ? 'w' : 'e'
                                        }
                                    ], props));
                        }
                    }
                }

                if ((prevNode !== null && !prevNodeIsJump)) {
                    subgraph.addEdge(new Edge([prevNode, node], {style: "dotted"}));
                }

                if(prevNode !== null) {
                    // add semi transparent edge from previous node to this node
                    subgraph.addEdge(new Edge([prevNode, node], { style: 'invis', dir: "both", constraint: true }));
                }

                prevNode = node;
                prevNodeIsJump = block.jumpTargets.length > 0;
            });

            G.addSubgraph(subgraph);
            graphs.push({name: frameName+"/"+funcName, graph: G});
        });

        return graphs.map(e => ({name: e.name, graph: toDot(e.graph)}));
    }
}
