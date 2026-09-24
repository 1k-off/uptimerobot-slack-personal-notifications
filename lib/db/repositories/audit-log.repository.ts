import { Collection, ObjectId } from 'mongodb';
import { getDatabase } from '../mongodb';

export const AUDIT_ACTOR_SYSTEM = 'system';

export type AuditAction = 'created' | 'updated' | 'deleted';

/** Compact append-only audit event. */
export interface AuditLogDocument {
  _id?: ObjectId;
  /** Action type */
  action: AuditAction;
  /** UptimeRobot monitor id */
  websiteId: number;
  /** Denormalized for deleted monitors / listing without joins */
  url?: string;
  name?: string;
  /** Actor email, or "system" for legacy/unknown */
  actor: string;
  /** Optional short list of changed field names (updates only) */
  fields?: string[];
  /** Human-readable action summary for UI */
  summary?: string;
  at: Date;
}

export interface AuditLogFilter {
  websiteId?: number;
  actor?: string;
  action?: AuditAction;
  search?: string;
}

class AuditLogRepository {
  private indexesReady = false;

  private async getCollection(): Promise<Collection<AuditLogDocument>> {
    const db = await getDatabase();
    const collection = db.collection<AuditLogDocument>('audit_logs');
    await this.ensureIndexes(collection);
    return collection;
  }

  private async ensureIndexes(
    collection: Collection<AuditLogDocument>,
  ): Promise<void> {
    if (this.indexesReady) return;
    try {
      await Promise.all([
        collection.createIndex({ at: -1 }),
        collection.createIndex({ websiteId: 1, at: -1 }),
        collection.createIndex({ actor: 1, at: -1 }),
        collection.createIndex({ action: 1, at: -1 }),
      ]);
      this.indexesReady = true;
    } catch (error) {
      console.error('Failed to ensure audit_logs indexes:', error);
    }
  }

  async append(
    entry: Omit<AuditLogDocument, '_id' | 'at'> & { at?: Date },
  ): Promise<AuditLogDocument> {
    const collection = await this.getCollection();
    const document: Omit<AuditLogDocument, '_id'> = {
      action: entry.action,
      websiteId: entry.websiteId,
      actor: entry.actor || AUDIT_ACTOR_SYSTEM,
      at: entry.at || new Date(),
      ...(entry.url ? { url: entry.url } : {}),
      ...(entry.name ? { name: entry.name } : {}),
      ...(entry.fields?.length ? { fields: entry.fields } : {}),
      ...(entry.summary ? { summary: entry.summary } : {}),
    };

    const result = await collection.insertOne(document as AuditLogDocument);
    return { ...document, _id: result.insertedId };
  }

  async findWithPagination(
    page: number = 1,
    limit: number = 50,
    filter: AuditLogFilter = {},
  ): Promise<{ items: AuditLogDocument[]; total: number }> {
    const collection = await this.getCollection();
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};

    if (typeof filter.websiteId === 'number' && !Number.isNaN(filter.websiteId)) {
      query.websiteId = filter.websiteId;
    }

    if (filter.actor) {
      query.actor = filter.actor;
    }

    if (filter.action) {
      query.action = filter.action;
    }

    if (filter.search?.trim()) {
      const search = filter.search.trim();
      const asNumber = parseInt(search, 10);
      const or: Record<string, unknown>[] = [
        { actor: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
      if (!Number.isNaN(asNumber)) {
        or.push({ websiteId: asNumber });
      }
      query.$or = or;
    }

    const [items, total] = await Promise.all([
      collection.find(query).sort({ at: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query),
    ]);

    return { items, total };
  }
}

export const auditLogRepository = new AuditLogRepository();
