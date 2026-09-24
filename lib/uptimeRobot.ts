import { setCachedData } from "./cache";
import { getEnvConfig } from "@/lib/config";

const UPTIMEROBOT_API_BASE = "https://api.uptimerobot.com/v3";
const DEFAULT_PAGE_LIMIT = 50;

/** Legacy numeric status codes used by the UI (v2-compatible). */
export const MONITOR_STATUS = {
  PAUSED: 0,
  NOT_CHECKED: 1,
  UP: 2,
  SEEMS_DOWN: 8,
  DOWN: 9,
} as const;

/** Legacy numeric monitor types used by the UI (v2-compatible). */
export const MONITOR_TYPE = {
  HTTP: 1,
  KEYWORD: 2,
  PING: 3,
  PORT: 4,
  HEARTBEAT: 5,
  DNS: 6,
  API: 7,
  UDP: 8,
  VISUAL_COMPARISON: 9,
} as const;

export type V3MonitorStatus =
  | "PAUSED"
  | "STARTED"
  | "UP"
  | "LOOKS_DOWN"
  | "DOWN"
  | string;

export type V3MonitorType =
  | "HTTP"
  | "KEYWORD"
  | "PING"
  | "PORT"
  | "HEARTBEAT"
  | "DNS"
  | "API"
  | "UDP"
  | "VISUAL_COMPARISON"
  | string;

export interface UptimeRobotMonitor {
  id: number;
  friendly_name: string;
  url: string;
  type: number;
  status: number;
  keyword_value?: string;
}

interface V3AssignedAlertContact {
  alertContactId: number;
  threshold: number;
  recurrence: number;
}

interface V3Monitor {
  id: number;
  friendlyName: string;
  url?: string;
  type?: V3MonitorType;
  status?: V3MonitorStatus;
  keywordValue?: string | null;
  assignedAlertContacts?: V3AssignedAlertContact[];
}

interface V3PaginatedMonitors {
  data?: V3Monitor[];
  nextLink?: string | null;
}

interface V3AlertContact {
  id: number;
  friendlyName: string | null;
}

interface NewMonitorParams {
  friendly_name: string;
  url: string;
  keyword_value?: string;
}

interface DeleteMonitorParams {
  id: number;
}

interface EditMonitorParams {
  id: number;
  friendly_name?: string;
  url?: string;
  keyword_value?: string;
}

export class UptimeRobotError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public raw?: unknown,
  ) {
    super(message);
    this.name = "UptimeRobotError";
  }
}

export function mapV3StatusToLegacy(status: V3MonitorStatus | undefined): number {
  switch ((status || "").toUpperCase()) {
    case "PAUSED":
      return MONITOR_STATUS.PAUSED;
    case "STARTED":
      return MONITOR_STATUS.NOT_CHECKED;
    case "UP":
      return MONITOR_STATUS.UP;
    case "LOOKS_DOWN":
      return MONITOR_STATUS.SEEMS_DOWN;
    case "DOWN":
      return MONITOR_STATUS.DOWN;
    default:
      return MONITOR_STATUS.NOT_CHECKED;
  }
}

export function mapV3TypeToLegacy(type: V3MonitorType | undefined): number {
  switch ((type || "").toUpperCase()) {
    case "HTTP":
      return MONITOR_TYPE.HTTP;
    case "KEYWORD":
      return MONITOR_TYPE.KEYWORD;
    case "PING":
      return MONITOR_TYPE.PING;
    case "PORT":
      return MONITOR_TYPE.PORT;
    case "HEARTBEAT":
      return MONITOR_TYPE.HEARTBEAT;
    case "DNS":
      return MONITOR_TYPE.DNS;
    case "API":
      return MONITOR_TYPE.API;
    case "UDP":
      return MONITOR_TYPE.UDP;
    case "VISUAL_COMPARISON":
      return MONITOR_TYPE.VISUAL_COMPARISON;
    default:
      return MONITOR_TYPE.HTTP;
  }
}

export function mapV3MonitorToLegacy(monitor: V3Monitor): UptimeRobotMonitor {
  return {
    id: monitor.id,
    friendly_name: monitor.friendlyName,
    url: monitor.url || "",
    type: mapV3TypeToLegacy(monitor.type),
    status: mapV3StatusToLegacy(monitor.status),
    keyword_value: monitor.keywordValue ?? undefined,
  };
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const data = payload as Record<string, unknown>;

  if (typeof data.message === "string" && data.message) {
    return data.message;
  }

  if (typeof data.error === "string" && data.error) {
    return data.error;
  }

  if (data.error && typeof data.error === "object") {
    const err = data.error as Record<string, unknown>;
    if (typeof err.message === "string" && err.message) {
      return err.message;
    }
    if (typeof err.type === "string" && err.type) {
      return err.type;
    }
  }

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === "string") {
      return first;
    }
    if (first && typeof first === "object" && "message" in first) {
      const message = (first as { message?: unknown }).message;
      if (typeof message === "string" && message) {
        return message;
      }
    }
  }

  return fallback;
}

function getApiKey(): string {
  const config = getEnvConfig();
  if (!config.uptimeRobotApiKey) {
    throw new Error("UPTIMEROBOT_API_KEY not configured");
  }
  return config.uptimeRobotApiKey;
}

async function uptimeRobotRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    apiKey?: string;
  } = {},
): Promise<T> {
  const apiKey = options.apiKey ?? getApiKey();
  const method = options.method ?? "GET";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${UPTIMEROBOT_API_BASE}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    throw new UptimeRobotError(
      extractErrorMessage(payload, `UptimeRobot API error (${response.status})`),
      response.status,
      payload,
    );
  }

  return payload as T;
}

function cursorFromNextLink(nextLink: string | null | undefined): number | null {
  if (!nextLink) {
    return null;
  }

  try {
    const url = new URL(nextLink);
    const cursor = url.searchParams.get("cursor");
    if (!cursor) {
      return null;
    }
    const parsed = Number(cursor);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function fetchMonitors(): Promise<UptimeRobotMonitor[]> {
  const config = getEnvConfig();
  const apiKey = getApiKey();
  const cacheTime = config.uptimeRobotDataCacheTime;

  try {
    const allMonitors: V3Monitor[] = [];
    let cursor: number | null = null;

    do {
      const params = new URLSearchParams({
        limit: String(DEFAULT_PAGE_LIMIT),
      });
      if (cursor !== null) {
        params.set("cursor", String(cursor));
      }

      const page = await uptimeRobotRequest<V3PaginatedMonitors>(
        `/monitors?${params.toString()}`,
        { apiKey },
      );

      const pageData = page.data || [];
      allMonitors.push(...pageData);

      cursor = cursorFromNextLink(page.nextLink);
      if (!page.nextLink || pageData.length === 0) {
        cursor = null;
      }
    } while (cursor !== null);

    const monitors = allMonitors.map(mapV3MonitorToLegacy);
    setCachedData("websites", { monitors, timestamp: Date.now() }, cacheTime);
    return monitors;
  } catch (error) {
    console.error("Error fetching monitors:", error);
    throw error;
  }
}

export async function getMonitor(id: number): Promise<UptimeRobotMonitor> {
  const monitor = await uptimeRobotRequest<V3Monitor>(`/monitors/${id}`);
  return mapV3MonitorToLegacy(monitor);
}

export async function newMonitor(
  params: NewMonitorParams,
): Promise<V3Monitor> {
  const alertContactIds = await getAlertContactsByNames();

  const assignedAlertContacts: V3AssignedAlertContact[] = alertContactIds.map(
    (id) => ({
      alertContactId: id,
      threshold: 0,
      recurrence: 0,
    }),
  );

  // Matches previous v2 behaviour: keyword_type=2 (not exists), keyword_case_type=1 (insensitive)
  const body = {
    friendlyName: params.friendly_name,
    url: params.url,
    type: "KEYWORD",
    interval: 60,
    timeout: 30,
    httpMethodType: "GET",
    keywordType: "ALERT_NOT_EXISTS",
    keywordCaseType: "CaseInsensitive",
    keywordValue: params.keyword_value || "",
    checkSSLErrors: true,
    domainExpirationReminder: true,
    ...(assignedAlertContacts.length
      ? { assignedAlertContacts }
      : {}),
  };

  return uptimeRobotRequest<V3Monitor>("/monitors", {
    method: "POST",
    body,
  });
}

export async function editMonitor(
  params: EditMonitorParams,
): Promise<V3Monitor> {
  const body: Record<string, unknown> = {};

  if (params.friendly_name !== undefined) {
    body.friendlyName = params.friendly_name;
  }

  if (params.url !== undefined) {
    body.url = params.url;
  }

  if (params.keyword_value !== undefined) {
    body.keywordValue = params.keyword_value;
  }

  return uptimeRobotRequest<V3Monitor>(`/monitors/${params.id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteMonitor(
  params: DeleteMonitorParams,
): Promise<void> {
  await uptimeRobotRequest<void>(`/monitors/${params.id}`, {
    method: "DELETE",
  });
}

export async function getAlertContactsByNames(): Promise<number[]> {
  const config = getEnvConfig();
  getApiKey();

  if (!config.uptimeRobotAlertContactNames.length) {
    console.warn(
      "No alert contact names specified in UPTIMEROBOT_ALERT_CONTACT_NAMES",
    );
    return [];
  }

  try {
    const contacts = await uptimeRobotRequest<V3AlertContact[]>(
      "/user/alert-contacts",
    );

    const matchingContacts = (contacts || [])
      .filter(
        (contact) =>
          !!contact.friendlyName &&
          config.uptimeRobotAlertContactNames.includes(contact.friendlyName),
      )
      .map((contact) => contact.id);

    if (matchingContacts.length < config.uptimeRobotAlertContactNames.length) {
      const foundNames = (contacts || [])
        .filter(
          (contact) =>
            !!contact.friendlyName &&
            config.uptimeRobotAlertContactNames.includes(contact.friendlyName),
        )
        .map((contact) => contact.friendlyName as string);
      const missingNames = config.uptimeRobotAlertContactNames.filter(
        (name) => !foundNames.includes(name),
      );
      console.warn("Some alert contact names were not found:", missingNames);
    }

    return matchingContacts;
  } catch (error) {
    console.error("Error fetching alert contacts:", error);
    throw error;
  }
}
