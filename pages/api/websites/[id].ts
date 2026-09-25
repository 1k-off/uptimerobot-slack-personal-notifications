import { websiteRepository, auditLogRepository } from '@/lib/db';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/api/response';
import { editMonitor, getMonitor, MONITOR_TYPE } from '@/lib/uptimeRobot';
import type { Group } from '@/types';
import {
  actorFromSession,
  requireAuthSession,
} from '@/lib/api/require-admin';
import { buildAuditSummary } from '@/lib/audit';

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function sameString(a: unknown, b: unknown): boolean {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function normalizeGroup(group: Group | null | undefined) {
  if (!group) return null;
  return { _id: group._id, name: group.name };
}

function normalizeAlertContacts(
  contacts:
    | {
        slack?: { users?: string[]; channels?: string[] };
      }
    | null
    | undefined,
) {
  return {
    slack: {
      users: [...(contacts?.slack?.users || [])].map(String).sort(),
      channels: [...(contacts?.slack?.channels || [])].map(String).sort(),
    },
  };
}

function normalizePrefs(
  prefs:
    | {
        downAlerts?: boolean;
        upAlerts?: boolean;
        latencyAlerts?: boolean;
      }
    | null
    | undefined,
) {
  return {
    downAlerts: prefs?.downAlerts ?? true,
    upAlerts: prefs?.upAlerts ?? true,
    latencyAlerts: prefs?.latencyAlerts ?? false,
  };
}

interface UpdateWebsiteRequest {
  alertContacts?: {
    slack: {
      users: string[];
      channels: string[];
    };
  };
  friendlyName?: string;
  url?: string;
  keywordValue?: string;
  group?: Group | null;
  notificationPreferences?: {
    downAlerts: boolean;
    upAlerts: boolean;
    latencyAlerts: boolean;
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const { method } = req;

  const websiteId = parseInt(id as string);

  if (isNaN(websiteId)) {
    return res.status(400).json({ error: 'Invalid website ID' });
  }

  switch (method) {
    case 'GET': {
      const website = await websiteRepository.findById(websiteId);

      let monitorKeyword: string | undefined;
      let monitorFriendlyName: string | undefined;
      let monitorUrl: string | undefined;

      try {
        const monitor = await getMonitor(websiteId);
        monitorKeyword = monitor.keyword_value;
        monitorFriendlyName = monitor.friendly_name;
        monitorUrl = monitor.url;
      } catch (error) {
        console.error('Failed to fetch UptimeRobot monitor:', error);
        if (!website) {
          return res.status(404).json({ error: 'Website not found' });
        }
      }

      if (!website && !monitorFriendlyName && !monitorUrl) {
        return res.status(404).json({ error: 'Website not found' });
      }

      return res.status(200).json({
        id: websiteId,
        ...(website || {}),
        friendlyName:
          website?.friendlyName || monitorFriendlyName || undefined,
        url: website?.url || monitorUrl || undefined,
        keywordValue: monitorKeyword ?? '',
        createdBy: website?.createdBy || 'system',
      });
    }

    case 'PUT': {
      const session = await requireAuthSession(req, res);
      if (!session) {
        return;
      }
      const actor = actorFromSession(session);

      const {
        alertContacts,
        friendlyName,
        url,
        keywordValue,
        group,
        notificationPreferences,
      } = req.body as UpdateWebsiteRequest;

      const existing = await websiteRepository.findById(websiteId);

      let currentKeyword = '';
      let currentUrl = existing?.url || '';
      let currentName = existing?.friendlyName || '';
      let monitorType: number | undefined;

      try {
        const monitor = await getMonitor(websiteId);
        currentKeyword = monitor.keyword_value || '';
        currentUrl = currentUrl || monitor.url || '';
        currentName = currentName || monitor.friendly_name || '';
        monitorType = monitor.type;
      } catch {
        // Compare against DB-only baseline if UptimeRobot is unavailable.
      }

      const changedFields: string[] = [];

      if (
        friendlyName !== undefined &&
        !sameString(friendlyName, currentName)
      ) {
        changedFields.push('friendlyName');
      }

      if (url !== undefined && !sameString(url, currentUrl)) {
        changedFields.push('url');
      }

      if (
        keywordValue !== undefined &&
        !sameString(keywordValue, currentKeyword)
      ) {
        const nextKeyword = (keywordValue || '').trim();
        const isKeywordMonitor = monitorType === MONITOR_TYPE.KEYWORD;

        // HTTP monitors cannot gain a keyword (type is immutable in UptimeRobot)
        if (!isKeywordMonitor && nextKeyword) {
          return res.status(400).json({
            error:
              'Cannot add a keyword to an HTTP monitor. Create a new monitor with a keyword instead.',
          });
        }

        changedFields.push('keyword');
      }

      if (
        alertContacts !== undefined &&
        stableJson(normalizeAlertContacts(alertContacts)) !==
          stableJson(normalizeAlertContacts(existing?.alertContacts))
      ) {
        changedFields.push('alertContacts');
      }

      if (
        group !== undefined &&
        stableJson(normalizeGroup(group)) !==
          stableJson(normalizeGroup(existing?.group ?? null))
      ) {
        changedFields.push('group');
      }

      if (
        notificationPreferences !== undefined &&
        stableJson(normalizePrefs(notificationPreferences)) !==
          stableJson(normalizePrefs(existing?.notificationPreferences))
      ) {
        changedFields.push('notificationPreferences');
      }

      if (changedFields.length === 0) {
        return res.status(200).json({ message: 'No changes detected' });
      }

      const shouldSyncUptimeRobot =
        changedFields.includes('friendlyName') ||
        changedFields.includes('url') ||
        changedFields.includes('keyword');

      if (shouldSyncUptimeRobot) {
        const uptimeRobotParams: {
          id: number;
          friendly_name?: string;
          url?: string;
          keyword_value?: string;
        } = { id: websiteId };

        if (changedFields.includes('friendlyName') && friendlyName !== undefined) {
          uptimeRobotParams.friendly_name = friendlyName;
        }
        if (changedFields.includes('url') && url !== undefined) {
          uptimeRobotParams.url = url;
        }
        if (changedFields.includes('keyword') && keywordValue !== undefined) {
          uptimeRobotParams.keyword_value = keywordValue;
        }

        try {
          await editMonitor(uptimeRobotParams);
        } catch (error) {
          console.error('Failed to update UptimeRobot monitor:', error);
          return res.status(500).json({
            error: 'Failed to update monitor in UptimeRobot',
            details:
              error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const updateFields: Record<string, unknown> = {
        updatedBy: actor,
      };

      if (changedFields.includes('alertContacts') && alertContacts !== undefined) {
        updateFields.alertContacts = alertContacts;
      }
      if (changedFields.includes('friendlyName') && friendlyName !== undefined) {
        updateFields.friendlyName = friendlyName;
      }
      if (changedFields.includes('url') && url !== undefined) {
        updateFields.url = url;
      }
      if (changedFields.includes('group') && group !== undefined) {
        updateFields.group = group;
      }
      if (
        changedFields.includes('notificationPreferences') &&
        notificationPreferences !== undefined
      ) {
        updateFields.notificationPreferences = notificationPreferences;
      }

      await websiteRepository.upsert(websiteId, updateFields);

      const auditUrl =
        (typeof updateFields.url === 'string' && updateFields.url) ||
        currentUrl ||
        undefined;
      const auditName =
        (typeof updateFields.friendlyName === 'string' &&
          updateFields.friendlyName) ||
        currentName ||
        undefined;

      try {
        await auditLogRepository.append({
          action: 'updated',
          websiteId,
          url: auditUrl,
          name: auditName,
          actor,
          fields: changedFields,
          summary: buildAuditSummary('updated', changedFields),
        });
      } catch (error) {
        console.error('Failed to persist update audit:', error);
      }

      res.status(200).json({ message: 'Website updated successfully' });
      return;
    }

    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${method} Not Allowed`);
      return;
  }
}

export default withErrorHandler(handler);
