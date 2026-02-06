import { Collection, ObjectId } from 'mongodb';
import { getDatabase } from '../mongodb';

export interface WebsiteDocument {
  _id?: ObjectId;
  id: number;
  alertContacts?: {
    slack: {
      users: string[];
      channels: string[];
    };
  };
  friendlyName?: string;
  url?: string;
  group?: {
    _id: string;
    name: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

class WebsiteRepository {
  private async getCollection(): Promise<Collection<WebsiteDocument>> {
    const db = await getDatabase();
    return db.collection<WebsiteDocument>('websites');
  }

  async findById(id: number): Promise<WebsiteDocument | null> {
    const collection = await this.getCollection();
    return collection.findOne({ id });
  }

  async findByIds(ids: number[]): Promise<WebsiteDocument[]> {
    const collection = await this.getCollection();
    return collection.find({ id: { $in: ids } }).toArray();
  }

  async findAll(): Promise<WebsiteDocument[]> {
    const collection = await this.getCollection();
    return collection.find({}).toArray();
  }

  async create(data: Omit<WebsiteDocument, '_id'>): Promise<WebsiteDocument> {
    const collection = await this.getCollection();
    const now = new Date();
    const document: Omit<WebsiteDocument, '_id'> = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await collection.insertOne(document as WebsiteDocument);
    return { ...document, _id: result.insertedId };
  }

  async update(id: number, data: Partial<WebsiteDocument>): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.updateOne(
      { id },
      { 
        $set: {
          ...data,
          updatedAt: new Date(),
        }
      }
    );
    return result.modifiedCount > 0;
  }

  async delete(id: number): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async upsert(id: number, data: Partial<WebsiteDocument>): Promise<WebsiteDocument> {
    const collection = await this.getCollection();
    const now = new Date();
    
    const result = await collection.findOneAndUpdate(
      { id },
      { 
        $set: {
          ...data,
          updatedAt: now,
        },
        $setOnInsert: {
          id,
          createdAt: now,
        }
      },
      { 
        upsert: true,
        returnDocument: 'after'
      }
    );
    
    return result!;
  }
}

export const websiteRepository = new WebsiteRepository();
