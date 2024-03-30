import { BytecodeInstructionType } from "./BytecodeInstructions";
import { DataWriter } from "./DataWriter";


export class CodeSegment {
    //instructions: PartialInstruction[] = [];
    writer: DataWriter = new DataWriter();

    jsonData: any = []
    lastInstruction: any = {}

    toJSON(){
        return this.jsonData;
    }

    getByteSize() {
        return this.writer.writePosition;
    }

    emitCustom(data: number, bytes: number | null) {
        if(bytes == null){
            return this.writer.push_bytesNeeded(data);
        }
        else {
            switch(bytes){
                case 1:
                    return this.writer.push_8(data);
                case 2:
                    return this.writer.push_16(data);
                case 4:
                    return this.writer.push_32(data);
                case 8:
                    return this.writer.push_64(data);
                default:
                    throw new Error("Unsupported byte size");
            }
        }
    }

    emitAtCustom(position: number, data: number, bytes: number | null) {
        let oldPos = this.writer.writePosition;
        this.writer.writePosition = position;
        this.emitCustom(data, bytes);
        this.writer.writePosition = oldPos;
    }


    emit(instruction: BytecodeInstructionType, ...args: number[]){
        let obj: any = {}
        obj[this.writer.writePosition] = [BytecodeInstructionType[instruction], ...args]
        this.jsonData.push(obj);

        this.writer.push_8(instruction);
        switch(instruction){
            case BytecodeInstructionType.mv_reg_reg:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);

            case BytecodeInstructionType.mv_reg_reg_ptr:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]);
            
            case BytecodeInstructionType.mv_reg_null:
                return this.writer.push_8(args[0]);

            case BytecodeInstructionType.mv_reg_i:
                this.writer.push_8(args[0]);
                return this.writer.push_bytesNeeded(args[1]);

            case BytecodeInstructionType.mv_reg_const:
                this.writer.push_8(args[0]);
                this.writer.push_bytesNeeded(args[1]);
                return this.writer.push_8(args[2]);


            case BytecodeInstructionType.mv_reg_const_ptr:
                this.writer.push_8(args[0]);
                return this.writer.push_bytesNeeded(args[1]);
                


            case BytecodeInstructionType.mv_global_reg:
                this.writer.push_bytesNeeded(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);

            case BytecodeInstructionType.mv_global_reg_ptr:
                this.writer.push_bytesNeeded(args[0]);
                return this.writer.push_8(args[1]);
                
                

            case BytecodeInstructionType.mv_reg_global:
                this.writer.push_8(args[0]);
                this.writer.push_bytesNeeded(args[1]);
                return this.writer.push_8(args[2]);

            case BytecodeInstructionType.mv_reg_global_ptr:
                this.writer.push_8(args[0]);
                return this.writer.push_bytesNeeded(args[1]);

            case BytecodeInstructionType.s_alloc:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_16(args[2]);

            case BytecodeInstructionType.s_alloc_shadow:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);

            case BytecodeInstructionType.s_set_offset:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_16(args[2]);
                
            case BytecodeInstructionType.s_set_offset_shadow:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);

            case BytecodeInstructionType.s_loadf:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                this.writer.push_8(args[2]);
                return this.writer.push_8(args[3]);


            case BytecodeInstructionType.s_loadf_ptr:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);
                
            case BytecodeInstructionType.s_storef_const:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                this.writer.push_64(args[2]);
                return this.writer.push_8(args[3]);
                
            case BytecodeInstructionType.s_storef_const_ptr:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_64(args[2]);
                
            case BytecodeInstructionType.s_storef_reg:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                this.writer.push_8(args[2]);
                return this.writer.push_8(args[3]);
                
            case BytecodeInstructionType.s_storef_reg_ptr:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);
                
            case BytecodeInstructionType.c_alloc:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                this.writer.push_16(args[2]);
                return this.writer.push_bytesNeeded(args[3]);
                
            case BytecodeInstructionType.c_storem:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_64(args[2]);

            case BytecodeInstructionType.c_loadm:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);

            case BytecodeInstructionType.c_storef_reg:
                this.writer.push_8(args[0]);
                this.writer.push_16(args[1]);
                this.writer.push_8(args[2]);  
                return this.writer.push_8(args[3]);
                
            case BytecodeInstructionType.c_storef_reg_ptr:
                this.writer.push_8(args[0]);
                this.writer.push_16(args[1]);
                return this.writer.push_8(args[2]);  

            case BytecodeInstructionType.c_storef_const:
                this.writer.push_8(args[0]);
                this.writer.push_16(args[1]);
                this.writer.push_64(args[2]);  
                return this.writer.push_8(args[3]);

            case BytecodeInstructionType.c_storef_const_ptr:
                this.writer.push_8(args[0]);
                this.writer.push_16(args[1]);
                return this.writer.push_64(args[2]);
            
            case BytecodeInstructionType.c_loadf:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                this.writer.push_16(args[2]);
                return this.writer.push_8(args[3]);

            case BytecodeInstructionType.c_loadf_ptr:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_16(args[2]);            

            case BytecodeInstructionType.i_alloc:
            case BytecodeInstructionType.i_alloc_i:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);

            case BytecodeInstructionType.i_set_offset:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_16(args[2]);

            case BytecodeInstructionType.i_set_offset_i:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                this.writer.push_8(args[2]);       
                return this.writer.push_8(args[3]);       

            case BytecodeInstructionType.i_set_offset_m:
                this.writer.push_8(args[0]);
                this.writer.push_64(args[1]);
                this.writer.push_16(args[2]);
                return this.writer.push_64(args[3]);
                
            case BytecodeInstructionType.i_loadm:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]); 
                
            case BytecodeInstructionType.i_is_c:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_64(args[2]);   

            case BytecodeInstructionType.i_is_i:
                this.writer.push_64(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_64(args[2]); 
                
            case BytecodeInstructionType.i_get_c:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]);

            case BytecodeInstructionType.a_alloc:
                this.writer.push_8(args[0]);
                this.writer.push_64(args[1]);
                return this.writer.push_8(args[2]); 
                
            case BytecodeInstructionType.a_extend:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]);
                
            case BytecodeInstructionType.a_len:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]); 

            case BytecodeInstructionType.a_slice:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                this.writer.push_8(args[2]);
                return this.writer.push_8(args[3]);
                
            case BytecodeInstructionType.a_storef_reg:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                this.writer.push_8(args[2]); 
                return this.writer.push_8(args[3]);

            case BytecodeInstructionType.a_storef_reg_ptr:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]); 

            case BytecodeInstructionType.a_storef_const:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                this.writer.push_64(args[2]); 
                return this.writer.push_8(args[3]);

            case BytecodeInstructionType.a_storef_const_ptr:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_64(args[2]); 

            case BytecodeInstructionType.a_loadf:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                this.writer.push_8(args[2]);
                return this.writer.push_8(args[3]);

            case BytecodeInstructionType.a_loadf_ptr:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);
                
            case BytecodeInstructionType.push:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]);

            case BytecodeInstructionType.push_ptr:
                return this.writer.push_8(args[0]);

            case BytecodeInstructionType.push_const:
                this.writer.push_bytesNeeded(args[0]);
                return this.writer.push_8(args[1]);

            case BytecodeInstructionType.pop:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]);
            
            case BytecodeInstructionType.pop_ptr:
                return this.writer.push_8(args[0]);
                
            case BytecodeInstructionType.fn_alloc:
                return -1

            case BytecodeInstructionType.fn_set_reg:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);

            case BytecodeInstructionType.fn_set_reg_ptr:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]);

            case BytecodeInstructionType.fn_call:
                return this.writer.push_8(args[0]);

            case BytecodeInstructionType.fn_calli:
                this.writer.push_8(8); // presume 8 bytes
                return this.writer.push_64(args[0]);

            case BytecodeInstructionType.fn_ret:
                return -1

            case BytecodeInstructionType.fn_get_ret_reg:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);
    
            case BytecodeInstructionType.fn_get_ret_reg_ptr:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]);

            case BytecodeInstructionType.cast_i8_u8:
            case BytecodeInstructionType.cast_u8_i8:
            case BytecodeInstructionType.cast_i16_u16:
            case BytecodeInstructionType.cast_u16_i16:
            case BytecodeInstructionType.cast_i32_u32:
            case BytecodeInstructionType.cast_u32_i32:
            case BytecodeInstructionType.cast_i64_u64:
            case BytecodeInstructionType.cast_u64_i64:
            case BytecodeInstructionType.cast_i32_f32:
            case BytecodeInstructionType.cast_f32_i32:
            case BytecodeInstructionType.cast_i64_f64:
            case BytecodeInstructionType.cast_f64_i64:
                return this.writer.push_8(args[0]);
                
            case BytecodeInstructionType.upcast_i:
            case BytecodeInstructionType.upcast_u:
            case BytecodeInstructionType.upcast_f:
            case BytecodeInstructionType.dcast_i:
            case BytecodeInstructionType.dcast_u:
            case BytecodeInstructionType.dcast_f:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);
            
            case BytecodeInstructionType.add_i8:
            case BytecodeInstructionType.add_u8:
            case BytecodeInstructionType.add_i16:
            case BytecodeInstructionType.add_u16:
            case BytecodeInstructionType.add_i32:
            case BytecodeInstructionType.add_u32:
            case BytecodeInstructionType.add_i64:
            case BytecodeInstructionType.add_u64:
            case BytecodeInstructionType.add_f32:
            case BytecodeInstructionType.add_f64:
            case BytecodeInstructionType.add_ptr_u8:
            case BytecodeInstructionType.add_ptr_u16:
            case BytecodeInstructionType.add_ptr_u32:
            case BytecodeInstructionType.add_ptr_u64:
            case BytecodeInstructionType.sub_i8:
            case BytecodeInstructionType.sub_u8:
            case BytecodeInstructionType.sub_i16:
            case BytecodeInstructionType.sub_u16:
            case BytecodeInstructionType.sub_i32:
            case BytecodeInstructionType.sub_u32:
            case BytecodeInstructionType.sub_i64:
            case BytecodeInstructionType.sub_u64:
            case BytecodeInstructionType.sub_f32:
            case BytecodeInstructionType.sub_f64:
            case BytecodeInstructionType.sub_ptr_u8:
            case BytecodeInstructionType.sub_ptr_u16:
            case BytecodeInstructionType.sub_ptr_u32:
            case BytecodeInstructionType.sub_ptr_u64:
            case BytecodeInstructionType.mul_i8:
            case BytecodeInstructionType.mul_u8:
            case BytecodeInstructionType.mul_i16:
            case BytecodeInstructionType.mul_u16:
            case BytecodeInstructionType.mul_i32:
            case BytecodeInstructionType.mul_u32:
            case BytecodeInstructionType.mul_i64:
            case BytecodeInstructionType.mul_u64:
            case BytecodeInstructionType.mul_f32:
            case BytecodeInstructionType.mul_f64:
            case BytecodeInstructionType.div_i8:
            case BytecodeInstructionType.div_u8:
            case BytecodeInstructionType.div_i16:
            case BytecodeInstructionType.div_u16:
            case BytecodeInstructionType.div_i32:
            case BytecodeInstructionType.div_u32:
            case BytecodeInstructionType.div_i64:
            case BytecodeInstructionType.div_u64:
            case BytecodeInstructionType.div_f32:
            case BytecodeInstructionType.div_f64:
            case BytecodeInstructionType.mod_i8:
            case BytecodeInstructionType.mod_u8:
            case BytecodeInstructionType.mod_i16:
            case BytecodeInstructionType.mod_u16:
            case BytecodeInstructionType.mod_i32:
            case BytecodeInstructionType.mod_u32:
            case BytecodeInstructionType.mod_i64:
            case BytecodeInstructionType.mod_u64:
            case BytecodeInstructionType.lshift_i8:
            case BytecodeInstructionType.lshift_u8:
            case BytecodeInstructionType.lshift_i16:
            case BytecodeInstructionType.lshift_u16:
            case BytecodeInstructionType.lshift_i32:
            case BytecodeInstructionType.lshift_u32:
            case BytecodeInstructionType.lshift_i64:
            case BytecodeInstructionType.lshift_u64:
            case BytecodeInstructionType.rshift_i8:
            case BytecodeInstructionType.rshift_u8:
            case BytecodeInstructionType.rshift_i16:
            case BytecodeInstructionType.rshift_u16:
            case BytecodeInstructionType.rshift_i32:
            case BytecodeInstructionType.rshift_u32:
            case BytecodeInstructionType.rshift_i64:
            case BytecodeInstructionType.rshift_u64:
            case BytecodeInstructionType.band_8:
            case BytecodeInstructionType.band_16:
            case BytecodeInstructionType.band_32:
            case BytecodeInstructionType.band_64:
            case BytecodeInstructionType.bor_8:
            case BytecodeInstructionType.bor_16:
            case BytecodeInstructionType.bor_32:
            case BytecodeInstructionType.bor_64:
            case BytecodeInstructionType.bxor_8:
            case BytecodeInstructionType.bxor_16:
            case BytecodeInstructionType.bxor_32:
            case BytecodeInstructionType.bxor_64:
            case BytecodeInstructionType.and:
            case BytecodeInstructionType.or:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);
        

            case BytecodeInstructionType.bnot_8:
            case BytecodeInstructionType.bnot_16:
            case BytecodeInstructionType.bnot_32:
            case BytecodeInstructionType.bnot_64:
            case BytecodeInstructionType.not:

                

                

            case BytecodeInstructionType.j:
                this.writer.push_8(8); // presume 8 bytes
                return this.writer.push_64(args[0]);
                

            case BytecodeInstructionType.j_cmp_i8:
            case BytecodeInstructionType.j_cmp_u8:
            case BytecodeInstructionType.j_cmp_i16:
            case BytecodeInstructionType.j_cmp_u16:
            case BytecodeInstructionType.j_cmp_i32:
            case BytecodeInstructionType.j_cmp_u32:
            case BytecodeInstructionType.j_cmp_i64:
            case BytecodeInstructionType.j_cmp_u64:
            case BytecodeInstructionType.j_cmp_f32:
            case BytecodeInstructionType.j_cmp_f64:
            case BytecodeInstructionType.j_cmp_ptr:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                this.writer.push_8(args[2]);
                return this.writer.push_64(args[3]);


            case BytecodeInstructionType.reg_ffi:
                this.writer.push_bytesNeeded(args[0]);
                return this.writer.push_16(args[1]);

            case BytecodeInstructionType.open_ffi:
                return this.writer.push_16(args[0]);

            case BytecodeInstructionType.ld_ffi:
                this.writer.push_8(args[0]);
                this.writer.push_16(args[1]);
                return this.writer.push_8(args[2]);
            
            case BytecodeInstructionType.call_ffi:
                return this.writer.push_8(args[0]);

            case BytecodeInstructionType.close_ffi:
                return this.writer.push_16(args[0]);
            
        
            case BytecodeInstructionType.promise_alloc:
                return this.writer.push_8(args[0]);
            
            case BytecodeInstructionType.promise_resolve:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]);
                         
            case BytecodeInstructionType.promise_await:
                return this.writer.push_8(args[0]);
        
            case BytecodeInstructionType.promise_data:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]);
            
            case BytecodeInstructionType.lock_alloc:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]);
                         
            case BytecodeInstructionType.lock_acquire:
                this.writer.push_8(args[0]);
                return this.writer.push_8(args[1]);

            case BytecodeInstructionType.lock_release:
                return this.writer.push_8(args[0]);
            
            case BytecodeInstructionType.debug_reg:
                return this.writer.push_8(args[0]);
            
            case BytecodeInstructionType.halt:
                return this.writer.push_8(args[0]);

            case BytecodeInstructionType.load_std:
                this.writer.push_8(args[0]);
                this.writer.push_8(args[1]);
                return this.writer.push_8(args[2]);
                
            case BytecodeInstructionType.vm_health:
                return this.writer.push_8(args[0]);
            
            case BytecodeInstructionType.spill_alloc:
                return this.writer.push_16(args[0]);
            
            case BytecodeInstructionType.spill_reg:
                this.writer.push_16(args[0]);
                return this.writer.push_8(args[1]);

            case BytecodeInstructionType.unspill_reg:
                this.writer.push_8(args[0]);
                return this.writer.push_16(args[1]);

        }
    }
}
