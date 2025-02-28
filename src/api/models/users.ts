import mongoose, { Document, Schema, Model } from "mongoose";

export interface IUser extends Document {
    chatId: number,
    refreshToken: string
}

const userSchema: Schema<IUser> = new Schema({
    chatId: Number,
    refreshToken: String
})

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;