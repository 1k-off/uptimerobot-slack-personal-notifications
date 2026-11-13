import { Collection, ObjectId } from 'mongodb';
import { getDatabase } from '../mongodb';
import { AUDIT_ACTOR_SYSTEM } from './audit-log.repository';

export type AccessAuditAction = 'created' | 'updated' | 'deleted';

export interface AccessAuditLogDocument {
  _id?: ObjectId;
  action: AccessAuditAction;
  actor: string;
  accessId: number;
  glpiUserId: number;
  /** Display name of the GLPI user the access belongs to */
  glpiUserName?: string;
  accessName?: string;
  projectId?: number;
  projectName?: string;
  fields?: string[];
  summary: string;
  at: Date;
}

export interface AccessAuditLogFilter {
  accessId?: number;
  glpiUserId?: number;
  actor?: string;
  action?: AccessAuditAction;
  search?: string;
}

class AccessAuditLogRepository {
  private indexesReady = false;

  private async getCollection(): Promise<Collection<AccessAuditLogDocument>> {
    const db = await getDatabase();
    const collection = db.collection<AccessAuditLogDocument>('access_audit_logs');
    await this.ensureIndexes(collection);
    return collection;
  }

  private async ensureIndexes(
    collection: Collection<AccessAuditLogDocument>,
  ): Promise<void> {
    if (this.indexesReady) return;
    try {
      await Promise.all([
        collection.createIndex({ at: -1 }),
        collection.createIndex({ accessId: 1, at: -1 }),
        collection.createIndex({ glpiUserId: 1, at: -1 }),
        collection.createIndex({ actor: 1, at: -1 }),
        collection.createIndex({ action: 1, at: -1 }),
      ]);
      this.indexesReady = true;
    } catch (error) {
      console.error('Failed to ensure access_audit_logs indexes:', error);
    }
  }

  async append(
    entry: Omit<AccessAuditLogDocument, '_id' | 'at' | 'summary'> & {
      at?: Date;
      summary?: string;
    },
  ): Promise<AccessAuditLogDocument> {
    const collection = await this.getCollection();
    const summary =
      entry.summary ||
      buildAccessAuditSummary(entry.action, entry.fields, entry.accessName);

    const document: Omit<AccessAuditLogDocument, '_id'> = {
      action: entry.action,
      actor: entry.actor || AUDIT_ACTOR_SYSTEM,
      accessId: entry.accessId,
      glpiUserId: entry.glpiUserId,
      summary,
      at: entry.at || new Date(),
      ...(entry.accessName ? { accessName: entry.accessName } : {}),
      ...(entry.glpiUserName ? { glpiUserName: entry.glpiUserName } : {}),
      ...(typeof entry.projectId === 'number'
        ? { projectId: entry.projectId }
        : {}),
      ...(entry.projectName ? { projectName: entry.projectName } : {}),
      ...(entry.fields?.length ? { fields: entry.fields } : {}),
    };

    const result = await collection.insertOne(document as AccessAuditLogDocument);
    return { ...document, _id: result.insertedId };
  }

  async findWithPagination(
    page: number = 1,
    limit: number = 50,
    filter: AccessAuditLogFilter = {},
  ): Promise<{ items: AccessAuditLogDocument[]; total: number }> {
    const collection = await this.getCollection();
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};

    if (typeof filter.accessId === 'number' && !Number.isNaN(filter.accessId)) {
      query.accessId = filter.accessId;
    }
    if (
      typeof filter.glpiUserId === 'number' &&
      !Number.isNaN(filter.glpiUserId)
    ) {
      query.glpiUserId = filter.glpiUserId;
    }
    if (filter.actor) query.actor = filter.actor;
    if (filter.action) query.action = filter.action;

    if (filter.search?.trim()) {
      const search = filter.search.trim();
      const asNumber = parseInt(search, 10);
      const or: Record<string, unknown>[] = [
        { actor: { $regex: search, $options: 'i' } },
        { glpiUserName: { $regex: search, $options: 'i' } },
        { accessName: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
      if (!Number.isNaN(asNumber)) {
        or.push({ accessId: asNumber }, { glpiUserId: asNumber });
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

export function buildAccessAuditSummary(
  action: AccessAuditAction,
  fields?: string[],
  accessName?: string,
): string {
  const label = accessName ? ` "${accessName}"` : '';
  if (action === 'created') return `Access${label} created`;
  if (action === 'deleted') return `Access${label} soft-deleted`;
  if (fields?.length) return `Updated ${fields.join(', ')}`;
  return `Access${label} updated`;
}

export const accessAuditLogRepository = new AccessAuditLogRepository();
