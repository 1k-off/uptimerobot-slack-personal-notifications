import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetEnvConfig, mockSetCachedData } = vi.hoisted(() => ({
  mockGetEnvConfig: vi.fn(),
  mockSetCachedData: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  getEnvConfig: mockGetEnvConfig,
}));

vi.mock("@/lib/cache", () => ({
  setCachedData: mockSetCachedData,
}));

import {
  MONITOR_STATUS,
  MONITOR_TYPE,
  deleteMonitor,
  editMonitor,
  fetchMonitors,
  getDefaultIntegrationIds,
  getMonitor,
  mapV3MonitorToLegacy,
  mapV3StatusToLegacy,
  mapV3TypeToLegacy,
  newMonitor,
} from "@/lib/uptimeRobot";

const API_KEY = "ur-test-api-key";

function mockConfig(
  overrides: Partial<{
    uptimeRobotApiKey: string;
    uptimeRobotDataCacheTime: number;
    uptimeRobotAlertContactNames: string[];
  }> = {},
) {
  mockGetEnvConfig.mockReturnValue({
    uptimeRobotApiKey: API_KEY,
    uptimeRobotDataCacheTime: 60,
    uptimeRobotAlertContactNames: ["Slack Alerts"],
    ...overrides,
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("UptimeRobot v3 mappers", () => {
  it("maps status strings to legacy numeric codes", () => {
    expect(mapV3StatusToLegacy("PAUSED")).toBe(MONITOR_STATUS.PAUSED);
    expect(mapV3StatusToLegacy("STARTED")).toBe(MONITOR_STATUS.NOT_CHECKED);
    expect(mapV3StatusToLegacy("UP")).toBe(MONITOR_STATUS.UP);
    expect(mapV3StatusToLegacy("LOOKS_DOWN")).toBe(MONITOR_STATUS.SEEMS_DOWN);
    expect(mapV3StatusToLegacy("DOWN")).toBe(MONITOR_STATUS.DOWN);
    expect(mapV3StatusToLegacy("unknown")).toBe(MONITOR_STATUS.NOT_CHECKED);
  });

  it("maps type strings to legacy numeric codes", () => {
    expect(mapV3TypeToLegacy("KEYWORD")).toBe(MONITOR_TYPE.KEYWORD);
    expect(mapV3TypeToLegacy("http")).toBe(MONITOR_TYPE.HTTP);
    expect(mapV3TypeToLegacy("PING")).toBe(MONITOR_TYPE.PING);
  });

  it("maps a v3 monitor into the legacy shape", () => {
    expect(
      mapV3MonitorToLegacy({
        id: 42,
        friendlyName: "example.com",
        url: "https://example.com",
        type: "KEYWORD",
        status: "UP",
        keywordValue: "ok",
      }),
    ).toEqual({
      id: 42,
      friendly_name: "example.com",
      url: "https://example.com",
      type: MONITOR_TYPE.KEYWORD,
      status: MONITOR_STATUS.UP,
      keyword_value: "ok",
    });
  });
});

describe("UptimeRobot v3 client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockConfig();
    mockSetCachedData.mockClear();
  });

  it("fetchMonitors paginates with cursor and Bearer auth", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: 1,
              friendlyName: "one",
              url: "https://one.example",
              type: "KEYWORD",
              status: "UP",
            },
          ],
          nextLink: "https://api.uptimerobot.com/v3/monitors?cursor=51&limit=50",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: 2,
              friendlyName: "two",
              url: "https://two.example",
              type: "HTTP",
              status: "DOWN",
            },
          ],
          nextLink: null,
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const monitors = await fetchMonitors();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.uptimerobot.com/v3/monitors?limit=50",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.uptimerobot.com/v3/monitors?limit=50&cursor=51",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "GET",
      headers: expect.objectContaining({
        Authorization: `Bearer ${API_KEY}`,
      }),
    });
    expect(monitors).toEqual([
      {
        id: 1,
        friendly_name: "one",
        url: "https://one.example",
        type: MONITOR_TYPE.KEYWORD,
        status: MONITOR_STATUS.UP,
        keyword_value: undefined,
      },
      {
        id: 2,
        friendly_name: "two",
        url: "https://two.example",
        type: MONITOR_TYPE.HTTP,
        status: MONITOR_STATUS.DOWN,
        keyword_value: undefined,
      },
    ]);
    expect(mockSetCachedData).toHaveBeenCalledWith(
      "websites",
      expect.objectContaining({ monitors }),
      60,
    );
  });

  it("getMonitor returns a mapped monitor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          id: 7,
          friendlyName: "site",
          url: "https://site.test",
          type: "KEYWORD",
          status: "LOOKS_DOWN",
          keywordValue: "alive",
        }),
      ),
    );

    await expect(getMonitor(7)).resolves.toMatchObject({
      id: 7,
      friendly_name: "site",
      status: MONITOR_STATUS.SEEMS_DOWN,
      keyword_value: "alive",
    });
  });

  it("newMonitor creates a KEYWORD monitor with default integrations", async () => {
    mockConfig({
      uptimeRobotAlertContactNames: ["ucc", "alerts"],
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            { id: 11, friendlyName: "ucc", type: "Webhook" },
            { id: 12, friendlyName: "Other" },
            { id: 13, friendlyName: "alerts", type: "Slack" },
          ],
          nextLink: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 99,
          friendlyName: "example.com",
          url: "https://example.com",
          type: "KEYWORD",
          status: "STARTED",
          keywordValue: "Welcome",
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const created = await newMonitor({
      friendly_name: "example.com",
      url: "https://example.com",
      keyword_value: "Welcome",
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.uptimerobot.com/v3/integrations",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.uptimerobot.com/v3/monitors",
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      }),
    });

    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(body).toEqual({
      friendlyName: "example.com",
      url: "https://example.com",
      type: "KEYWORD",
      interval: 60,
      timeout: 30,
      httpMethodType: "GET",
      keywordType: "ALERT_NOT_EXISTS",
      keywordCaseType: "CaseInsensitive",
      keywordValue: "Welcome",
      checkSSLErrors: true,
      domainExpirationReminder: true,
      assignedAlertContacts: [
        { alertContactId: 11, threshold: 0, recurrence: 0 },
        { alertContactId: 13, threshold: 0, recurrence: 0 },
      ],
    });
    expect(created.id).toBe(99);
  });

  it("editMonitor PATCHes camelCase fields including keyword", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: 5,
        friendlyName: "renamed",
        url: "https://new.example",
        keywordValue: "health",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await editMonitor({
      id: 5,
      friendly_name: "renamed",
      url: "https://new.example",
      keyword_value: "health",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.uptimerobot.com/v3/monitors/5",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      friendlyName: "renamed",
      url: "https://new.example",
      keywordValue: "health",
    });
  });

  it("newMonitor creates an HTTP monitor when keyword is empty", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [], nextLink: null }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 100,
          friendlyName: "example.com",
          url: "https://example.com",
          type: "HTTP",
          status: "STARTED",
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    await newMonitor({
      friendly_name: "example.com",
      url: "https://example.com",
    });

    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(body).toEqual({
      friendlyName: "example.com",
      url: "https://example.com",
      type: "HTTP",
      interval: 60,
      timeout: 30,
      httpMethodType: "GET",
      checkSSLErrors: true,
      domainExpirationReminder: true,
    });
  });

  it("editMonitor updates keyword value without changing type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: 5,
        type: "KEYWORD",
        keywordValue: "",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await editMonitor({
      id: 5,
      keyword_value: "  ",
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      keywordValue: "",
    });
  });

  it("deleteMonitor issues DELETE", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteMonitor({ id: 3 })).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.uptimerobot.com/v3/monitors/3",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("getDefaultIntegrationIds filters by configured names (case-insensitive)", async () => {
    mockConfig({
      uptimeRobotAlertContactNames: ["ucc", "Alerts"],
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: [
            { id: 1, friendlyName: "UCC" },
            { id: 2, friendlyName: "Gamma" },
            { id: 3, friendlyName: "alerts" },
          ],
          nextLink: null,
        }),
      ),
    );

    await expect(getDefaultIntegrationIds()).resolves.toEqual([1, 3]);
  });

  it("getDefaultIntegrationIds paginates integrations", async () => {
    mockConfig({
      uptimeRobotAlertContactNames: ["ucc", "alerts"],
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ id: 1, friendlyName: "ucc" }],
          nextLink: "https://api.uptimerobot.com/v3/integrations?cursor=2",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ id: 2, friendlyName: "alerts" }],
          nextLink: null,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getDefaultIntegrationIds()).resolves.toEqual([1, 2]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.uptimerobot.com/v3/integrations",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.uptimerobot.com/v3/integrations?cursor=2",
    );
  });

  it("warns when configured integration names are missing", async () => {
    mockConfig({
      uptimeRobotAlertContactNames: ["ucc", "missing"],
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: [{ id: 1, friendlyName: "ucc" }],
          nextLink: null,
        }),
      ),
    );

    await expect(getDefaultIntegrationIds()).resolves.toEqual([1]);
    expect(warnSpy).toHaveBeenCalledWith(
      "Some default integration names were not found:",
      ["missing"],
    );
    warnSpy.mockRestore();
  });

  it("throws UptimeRobotError on API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(jsonResponse({ message: "Invalid API key" }, 401)),
      ),
    );

    await expect(getMonitor(1)).rejects.toMatchObject({
      name: "UptimeRobotError",
      message: "Invalid API key",
      statusCode: 401,
    });
  });

  it("throws when API key is missing", async () => {
    mockConfig({ uptimeRobotApiKey: "" });
    await expect(fetchMonitors()).rejects.toThrow(
      "UPTIMEROBOT_API_KEY not configured",
    );
  });
});
