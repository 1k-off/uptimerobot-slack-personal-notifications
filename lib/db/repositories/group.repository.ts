import { Collection, ObjectId } from 'mongodb';
import { getDatabase } from '../mongodb';

export interface GroupDocument {
  _id: ObjectId;
  name: string;
  websites?: number[];
  createdAt?: Date;
  updatedAt?: Date;
}

class GroupRepository {
  private async getCollection(): Promise<Collection<GroupDocument>> {
    const db = await getDatabase();
    return db.collection<GroupDocument>('groups');
  }

  async findById(id: string): Promise<GroupDocument | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: new ObjectId(id) });
  }

  async findAll(): Promise<GroupDocument[]> {
    const collection = await this.getCollection();
    return collection.find({}).toArray();
  }

  async findByName(name: string): Promise<GroupDocument | null> {
    const collection = await this.getCollection();
    return collection.findOne({ name });
  }

  async create(data: Omit<GroupDocument, '_id'>): Promise<GroupDocument> {
    const collection = await this.getCollection();
    const now = new Date();
    const document: Omit<GroupDocument, '_id'> = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await collection.insertOne(document as GroupDocument);
    return { ...document, _id: result.insertedId };
  }

  async update(id: string, data: Partial<GroupDocument>): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...data,
          updatedAt: new Date(),
        }
      }
    );
    return result.modifiedCount > 0;
  }

  async delete(id: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async addWebsiteToGroup(groupId: string, websiteId: number): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $addToSet: { websites: websiteId },
        $set: { updatedAt: new Date() }
      }
    );
    return result.modifiedCount > 0;
  }

  async removeWebsiteFromGroup(groupId: string, websiteId: number): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $pull: { websites: websiteId },
        $set: { updatedAt: new Date() }
      }
    );
    return result.modifiedCount > 0;
  }
}

export const groupRepository = new GroupRepository();
