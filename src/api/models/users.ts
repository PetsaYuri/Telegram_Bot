import mongoose, { Document, Schema, Model } from "mongoose";

export interface IUser extends Document {
    chatId: number,
    refreshToken: string,
    isTokenValid: boolean,
    discoveredInvalidToken: Date
}

const userSchema: Schema<IUser> = new Schema({
    chatId: {
        type: Number,
        required: true
    },

    refreshToken: {
        type: String,
        required: true
    },

    isTokenValid: {
        type: Boolean,
        default: true
    },

    discoveredInvalidToken: Date
})

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;