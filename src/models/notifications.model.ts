import mongoose, { Schema } from "mongoose";


export enum NotificationType {
  REACTED = "reacted", // e.g., "John Doe liked your post"
  COMMENT = "comment",
  CONNECTION_REQUEST = "connection_request",
  CONNECTION_ACCEPTED = "connection_accepted",
  MESSAGE = "message",
  FOLLOW = "follow",
}

export interface NotificationInterface extends mongoose.Document {
  _id: string;
  recipient_id: string;
  sender_id: string;
  type: NotificationType;
  reference_id?: string; // This can be a post ID, comment ID, etc.
  content?: string; // Content of the notification, e.g., "John Doe liked your post"
  is_read: boolean;
  created_at: Date;
}

const notificationSchema = new Schema({
  recipient_id: {
    type: String,
    ref: "users",
    required: true,
    index: true,
  },
  sender_id: {
    type: String,
    ref: "users",
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true,
  },
  reference_id: {
    type: Schema.Types.ObjectId,
    required: false,
  },
  content: {
    type: String,
    required: false,
  },
  is_read: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster querying of unread notifications
notificationSchema.index({ recipient_id: 1, is_read: 1 });

export default mongoose.model("notifications", notificationSchema);
