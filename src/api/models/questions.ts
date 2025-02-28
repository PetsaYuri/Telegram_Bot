import mongoose, { Document, Model, Schema } from "mongoose";

export interface IQuestion extends Document {
    question: string,
    answers: Array<String>,
    rightAnswer: string
}

const questionSchema: Schema<IQuestion> = new Schema({
    question: {
        type: String,
        require: true
    },
    answers: [{
        type: String
    }],
    rightAnswer: {
        type: String,
        require: true
    }
})

const Question: Model<IQuestion> = mongoose.model('Question', questionSchema);
export default Question;