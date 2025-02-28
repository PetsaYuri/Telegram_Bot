import mongoose, { Document, Model, Schema } from "mongoose";
import { IUser } from "./users";

export interface ICourse extends Document {
    courseId: number,
    title: string,
    lastTimeRetrieved: Date,
    user: IUser
}

const courseSchema: Schema<ICourse> = new Schema({
    courseId: {
        type: Number,
        required: true
    },

    title: {
        type: String,
        required: true
    },

    lastTimeRetrieved: Date,

    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

const Course: Model<ICourse> = mongoose.model<ICourse>('Course', courseSchema);
export default Course;