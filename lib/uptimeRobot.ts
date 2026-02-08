import { setCachedData } from "./cache";
import { getEnvConfig } from "@/lib/config";

export interface UptimeRobotMonitor {
  id: number;
  friendly_name: string;
  url: string;
  type: number;
  status: number;
  uptime_ratio: number;
}

interface UptimeRobotMonitorData {
  id: number;
  friendly_name: string;
  url: string;
  type: number;
  status: number;
  uptime_ratio: number;
}

interface UptimeRobotAlertContact {
  id: string;
  friendly_name: string;
}

interface UptimeRobotResponse {
  stat: "ok" | "fail";
  error?: string | { type?: string; message?: string; parameter_name?: string };
  monitors?: UptimeRobotMonitorData[];
  alert_contacts?: UptimeRobotAlertContact[];
  monitor?: UptimeRobotMonitorData;
  [key: string]: unknown;
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
}

class UptimeRobotError extends Error {
  constructor(
    message: string,
    public raw?: unknown,
  ) {
    super(message);
    this.name = "UptimeRobotError";
  }
}

export async function fetchMonitors(): Promise<UptimeRobotMonitor[]> {
  const config = getEnvConfig();

  if (!config.uptimeRobotApiKey) {
    throw new Error("UPTIMEROBOT_API_KEY not configured");
  }

  const limit = 50;
  let allMonitors: UptimeRobotMonitorData[] = [];
  let offset = 0;
  let totalMonitors = 0;

  const cacheTime = config.uptimeRobotDataCacheTime;

  try {
    do {
      const body = new URLSearchParams({
        api_key: config.uptimeRobotApiKey,
        format: "json",
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(
        "https://api.uptimerobot.com/v2/getMonitors",
        {
          method: "POST",
          body,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      const data: UptimeRobotResponse = await response.json();

      if (data.stat !== "ok") {
        let errorMessage = "Failed to fetch monitors";
        if (data.error) {
          if (typeof data.error === "string") {
            errorMessage = data.error;
          } else if (typeof data.error === "object") {
            errorMessage =
              data.error.message || data.error.type || JSON.stringify(data.error);
          }
        }
        throw new UptimeRobotError(errorMessage, data);
      }

      totalMonitors = data.monitors?.length || 0;
      allMonitors = allMonitors.concat(data.monitors || []);
      offset += limit;
    } while (totalMonitors === limit);

    const monitors: UptimeRobotMonitor[] = allMonitors.map((monitor) => ({
      id: monitor.id,
      friendly_name: monitor.friendly_name,
      url: monitor.url,
      type: monitor.type,
      status: monitor.status,
      uptime_ratio: monitor.uptime_ratio,
    }));

    setCachedData("websites", { monitors, timestamp: Date.now() }, cacheTime);
    return monitors;
  } catch (error) {
    console.error("Error fetching monitors:", error);
    throw error;
  }
}

export async function newMonitor(
  params: NewMonitorParams,
): Promise<UptimeRobotResponse> {
  const config = getEnvConfig();

  if (!config.uptimeRobotApiKey) {
    throw new Error("UPTIMEROBOT_API_KEY not configured");
  }

  const alertContactIds = await getAlertContactsByNames();

  // Format alert contacts with threshold and recurrence
  const formattedAlertContacts = alertContactIds
    .map((id) => `${id}_0_0`)
    .join("-");

  const body = new URLSearchParams({
    api_key: config.uptimeRobotApiKey,
    friendly_name: params.friendly_name,
    url: params.url,
    type: "2", // keyword
    keyword_type: "2",
    keyword_case_type: "1",
    keyword_value: params.keyword_value || "",
    interval: "60",
    timeout: "15",
    ignore_ssl_errors: "0",
    disable_domain_expire_notifications: "0",
    alert_contacts: formattedAlertContacts,
  });

  const response = await fetch("https://api.uptimerobot.com/v2/newMonitor", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data: UptimeRobotResponse = await response.json();

  if (data.stat !== "ok") {
    let errorMessage = "Failed to create new monitor";
    if (data.error) {
      if (typeof data.error === "string") {
        errorMessage = data.error;
      } else if (typeof data.error === "object") {
        errorMessage =
          data.error.message || data.error.type || JSON.stringify(data.error);
      }
    }
    throw new UptimeRobotError(errorMessage, data);
  }

  return data;
}

export async function editMonitor(
  params: EditMonitorParams,
): Promise<UptimeRobotResponse> {
  const config = getEnvConfig();

  if (!config.uptimeRobotApiKey) {
    throw new Error("UPTIMEROBOT_API_KEY not configured");
  }

  const bodyParams: Record<string, string> = {
    api_key: config.uptimeRobotApiKey,
    id: String(params.id),
  };

  if (params.friendly_name !== undefined) {
    bodyParams.friendly_name = params.friendly_name;
  }

  if (params.url !== undefined) {
    bodyParams.url = params.url;
  }

  const body = new URLSearchParams(bodyParams);

  const response = await fetch("https://api.uptimerobot.com/v2/editMonitor", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data: UptimeRobotResponse = await response.json();

  if (data.stat !== "ok") {
    let errorMessage = "Failed to edit monitor";
    if (data.error) {
      if (typeof data.error === "string") {
        errorMessage = data.error;
      } else if (typeof data.error === "object") {
        errorMessage =
          data.error.message || data.error.type || JSON.stringify(data.error);
      }
    }
    throw new UptimeRobotError(errorMessage, data);
  }

  return data;
}

export async function deleteMonitor(
  params: DeleteMonitorParams,
): Promise<UptimeRobotResponse> {
  const config = getEnvConfig();

  if (!config.uptimeRobotApiKey) {
    throw new Error("UPTIMEROBOT_API_KEY not configured");
  }

  const body = new URLSearchParams({
    api_key: config.uptimeRobotApiKey,
    id: String(params.id),
  });

  const response = await fetch("https://api.uptimerobot.com/v2/deleteMonitor", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data: UptimeRobotResponse = await response.json();

  if (data.stat !== "ok") {
    let errorMessage = "Failed to delete monitor";
    if (data.error) {
      if (typeof data.error === "string") {
        errorMessage = data.error;
      } else if (typeof data.error === "object") {
        errorMessage =
          data.error.message || data.error.type || JSON.stringify(data.error);
      }
    }
    throw new UptimeRobotError(errorMessage, data);
  }

  return data;
}

export async function getAlertContactsByNames(): Promise<string[]> {
  const config = getEnvConfig();

  if (!config.uptimeRobotApiKey) {
    throw new Error("UPTIMEROBOT_API_KEY not configured");
  }

  if (!config.uptimeRobotAlertContactNames.length) {
    console.warn(
      "No alert contact names specified in UPTIMEROBOT_ALERT_CONTACT_NAMES",
    );
    return [];
  }

  try {
    const body = new URLSearchParams({
      api_key: config.uptimeRobotApiKey,
      format: "json",
    });

    const response = await fetch(
      "https://api.uptimerobot.com/v2/getAlertContacts",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );

    const data: UptimeRobotResponse = await response.json();

    if (data.stat !== "ok") {
      let errorMessage = "Failed to fetch alert contacts";
      if (data.error) {
        if (typeof data.error === "string") {
          errorMessage = data.error;
        } else if (typeof data.error === "object") {
          errorMessage =
            data.error.message || data.error.type || JSON.stringify(data.error);
        }
      }
      throw new UptimeRobotError(errorMessage, data);
    }

    const matchingContacts =
      data.alert_contacts
        ?.filter((contact) =>
          config.uptimeRobotAlertContactNames.includes(contact.friendly_name),
        )
        .map((contact) => contact.id) || [];

    if (matchingContacts.length < config.uptimeRobotAlertContactNames.length) {
      const foundNames =
        data.alert_contacts
          ?.filter((contact) =>
            config.uptimeRobotAlertContactNames.includes(contact.friendly_name),
          )
          .map((contact) => contact.friendly_name) || [];
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
