import mongoose, { Document, Model, Schema } from "mongoose";
import User, { IUser } from "./users";
import Question, { IQuestion } from "./questions";

export interface ITest extends Document {
    name: string,
    creator: IUser,
    questions: Array<IQuestion>
}

const testSchema: Schema<ITest> = new Schema({
    name: String,
    creator: {
        ref: User
    },
    questions: [{
        type: mongoose.Types.ObjectId,
        ref: Question
    }]
});

const Test: Model<ITest> = mongoose.model('Test', testSchema);
export default Test;