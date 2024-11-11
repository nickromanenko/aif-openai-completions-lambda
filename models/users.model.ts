import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IUser {
    id: string;
    name: string;
    email: string;
    created_at?: Date;
}

const userSchema = new mongoose.Schema<IUser>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    created_at: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', userSchema);

export const getAllUsers = async (id: string) => {
    return User.find({ id }).sort({ created_at: 1 });
};

export const getUser = async (id: string) => {
    return User.findOne({ id });
};

export const getOrCreateUser = async (name: string, email: string) => {
    const user = await User.findOne({ email });
    if (user) {
        return user;
    }
    const id = uuidv4();
    return User.create({ id, name, email }) as Promise<IUser>;
};
