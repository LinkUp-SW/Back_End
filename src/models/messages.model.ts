import mongoose, { Schema } from "mongoose";
import { mediaInterface } from "./media.model";


export interface messagesInterface extends mongoose.Document{
    content: {
        message: string;
        media: mediaInterface;
    }[];
    timestamp: Date;
    is_seen: boolean;
    reactions: Enumerator[];
}

const messagesSchema = new Schema<messagesInterface>({
    content: [{
        message: { type: String},
        media: { type: Schema.Types.ObjectId, ref: "media" }
    }],
    timestamp: { type: Date, default: Date.now },
    is_seen: { type: Boolean, required: true},
    reactions: [{ type: Enumerator }]
});

const messages = mongoose.model<messagesInterface>('messages', messagesSchema);

export default messages;