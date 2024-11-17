import { Context } from "../ast/symbol/Context";
import { ClassType } from "../ast/types/ClassType";
import { DataType } from "../ast/types/DataType";
import { StructType } from "../ast/types/StructType";
import { isPointer } from "./CodeGenTypes";
import { DataWriter } from "./DataWriter";

export class TemplateSegment {
    registredOffsets: { [key: string]: number } = {};

    writer: DataWriter = new DataWriter();

    unresolvedLabels: { [key: string]: number[] } = {};

    getByteSize() {
        return this.writer.writePosition;
    }

    addLabel(label: string, position: number) {
        if (this.unresolvedLabels[label] == null) {
            this.unresolvedLabels[label] = [position];
        } else {
            this.unresolvedLabels[label].push(position);
        }
    }

    resolveForLabel(lbl: string, value: number) {
        if (this.unresolvedLabels[lbl] != null) {
            let positions = this.unresolvedLabels[lbl];
            if (positions == null) {
                return;
            }

            for (const pos of positions) {
                this.emitAtCustom(pos, value, 4);
            }
            delete this.unresolvedLabels[lbl];
        }
    }

    checkAllResolved() {
        return Object.keys(this.unresolvedLabels).length == 0;
    }

    emitCustom(data: number, bytes: number | null) {
        switch (bytes) {
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

    emitAtCustom(position: number, data: number, bytes: number) {
        let oldPos = this.writer.writePosition;
        this.writer.writePosition = position;
        this.emitCustom(data, bytes);
        this.writer.writePosition = oldPos;
    }

    constructor() {}

    registerStruct(ctx: Context, dt: DataType) {
        let st = (
            dt.dereference().to(ctx, StructType) as StructType
        ).toSortedStruct();
        if (st == null) {
            throw new Error("Expected struct type");
        }

        let id = st.serialize();

        // check if already registered
        if (this.registredOffsets[id] != null) {
            return this.registredOffsets[id];
        }

        // register
        /**
         * format:
         *  st_fields_count[1], st_data_size[2] +
         *  for every field: [gfield_id[4], field_offset[2], isFielPtr[1]]
         */

        let structWritePos = this.writer.writePosition;

        let structSize = st.getStructSize(ctx);
        this.writer.push_8(st.fields.length);
        this.writer.push_16(structSize);

        for (const [i, field] of st.fields.entries()) {
            this.writer.push_32(field.getFieldID());
            this.writer.push_16(st.getFieldOffset(i));
            this.writer.push_8(isPointer(field.type) ? 1 : 0);
        }

        // ensure 8 byte alignment
        //this.writer.alignTo8();

        this.registredOffsets[id] = structWritePos;
        return structWritePos;
    }

    registerClass(ctx: Context, dt: DataType) {
        let classType = dt.dereference().to(ctx, ClassType) as ClassType;

        let id = classType.serialize();

        // check if already registered
        if (this.registredOffsets[id] != null) {
            return this.registredOffsets[id];
        }

        // register
        /**
         * format:
         * num_attrs[1], num_methods[2], size_attrs[2], class_id[4] +
         * for each attribute: offset[2], isPtr[1]
         * for each method: method_id[4], method_offset[4]
         */

        let classWritePos = this.writer.writePosition;

        let num_attrs = classType.attributes.length;
        let size_attrs = classType.getAttributesBlockSize();
        // !!! IMPORTANT: we have to create new array as some other methods awaiting to be generated
        let classMethods = [...classType.getAllMethods()];
        let num_methods = classMethods.length;

        this.writer.push_8(num_attrs);
        this.writer.push_16(num_methods);
        this.writer.push_16(size_attrs);
        this.writer.push_32(classType.getClassID());

        for (const [i, field] of classType.attributes.entries()) {
            this.writer.push_16(classType.getAttributeOffset(i));
            this.writer.push_8(isPointer(field.type) ? 1 : 0);
        }

        classMethods.sort((a, b) => a.imethod.getUID() - b.imethod.getUID());

        for (let i = 0; i < classMethods.length; i++) {
            let method = classMethods[i];
            this.writer.push_32(method.imethod.getUID());
            let lbl = this.writer.push_32(0); // will be resolved later
            this.addLabel(method.context.uuid, lbl);
        }

        this.registredOffsets[id] = classWritePos;
        //this.writer.alignTo8();
        return classWritePos;
    }
}
