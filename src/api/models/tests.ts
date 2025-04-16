import mongoose, { Document, Model, Schema } from "mongoose";
import { TestTypes } from "../../bot/items/testing/enums/testTypes";

export interface ITest extends Document {
    title: string,
    chatId: number,
    type: TestTypes,
    questions: Map<string, string>
}

const testSchema: Schema<ITest> = new Schema({
    title: String,

    chatId: {
        type: Number,
        required: true,
    },

    type: {
        type: String,
        enum: TestTypes,
        required: true,
    },

    questions: {
        type: Map,
        of: String,
        required: true
    }
});

const Test: Model<ITest> = mongoose.model('Test', testSchema);
export default Test;