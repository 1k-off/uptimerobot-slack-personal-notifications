import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  messageId: string;
  channelId: string;
  threadTs?: string;
  websiteId: number;
  groupId?: string;
  alertType: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  messageId: {
    type: String,
    required: true,
    unique: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  threadTs: {
    type: String,
    required: false,
  },
  websiteId: {
    type: Number,
    required: true,
  },
  groupId: {
    type: String,
    required: false,
  },
  alertType: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema); 