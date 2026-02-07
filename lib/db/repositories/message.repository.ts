import { Collection, ObjectId } from 'mongodb';
import { getDatabase } from '../mongodb';

export interface MessageDocument {
  _id?: ObjectId;
  messageId: string;
  channelId: string;
  threadTs?: string;
  websiteId: number;
  groupId?: string;
  alertType: string;
  createdAt: Date;
  updatedAt: Date;
}

class MessageRepository {
  private async getCollection(): Promise<Collection<MessageDocument>> {
    const db = await getDatabase();
    return db.collection<MessageDocument>('messages');
  }

  async findByMessageId(messageId: string): Promise<MessageDocument | null> {
    const collection = await this.getCollection();
    return collection.findOne({ messageId });
  }

  async findOldMessages(cutoffTime: Date): Promise<MessageDocument[]> {
    const collection = await this.getCollection();
    return collection.find({ createdAt: { $lt: cutoffTime } }).toArray();
  }

  async create(data: Omit<MessageDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<MessageDocument> {
    const collection = await this.getCollection();
    const now = new Date();
    const document: Omit<MessageDocument, '_id'> = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await collection.insertOne(document as MessageDocument);
    return { ...document, _id: result.insertedId };
  }

  async updateThreadTs(messageId: string, threadTs: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.updateOne(
      { messageId },
      { 
        $set: { 
          threadTs,
          updatedAt: new Date()
        }
      }
    );
    return result.modifiedCount > 0;
  }

  async deleteOldMessages(cutoffTime: Date): Promise<number> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({
      createdAt: { $lt: cutoffTime }
    });
    return result.deletedCount;
  }

  async delete(messageId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ messageId });
    return result.deletedCount > 0;
  }

  async deleteAll(): Promise<number> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({});
    return result.deletedCount;
  }

  async findAll(): Promise<MessageDocument[]> {
    const collection = await this.getCollection();
    return collection.find({}).sort({ createdAt: -1 }).toArray();
  }
}

export const messageRepository = new MessageRepository();
