import mongoose, { Schema } from 'mongoose';

export interface IDbMessage {
    thread_id: string;
    role: string;
    content: string;
    url?: string;
    tool_calls?: any[];
    tool_call_id?: string;
    created_at?: Date;
}

const messageSchema = new mongoose.Schema<IDbMessage>({
    thread_id: { type: String, required: true },
    role: { type: String, required: true },
    content: { type: String },
    tool_calls: { type: Schema.Types.Mixed },
    tool_call_id: { type: String },
    url: { type: String },
    created_at: { type: Date, default: Date.now },
});

export const Message = mongoose.model<IDbMessage>('Message', messageSchema);

export const getAllMessages = async (threadId: string) => {
    return Message.find({ thread_id: threadId }).sort({ created_at: 1 });
};

export const createMessage = async (message: IDbMessage) => {
    return Message.create(message);
};
