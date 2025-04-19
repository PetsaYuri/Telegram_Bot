import mongoose, { Document, Model, Schema } from "mongoose";
import { TestTypes } from "../../bot/items/testing/enums/testTypes";

export interface ITest extends Document {
    title: string,
    chatId: number,
    type: TestTypes,
    questions: { [key: string]: string | string[] },
    rightAnswers: { [key: string]: string }
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
        type: Schema.Types.Mixed,
        required: true
    },

    rightAnswers: {
        type: Schema.Types.Mixed,
        required: false
    }
});

const Test: Model<ITest> = mongoose.model('Test', testSchema);
export default Test;