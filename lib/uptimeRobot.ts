import { setCachedData } from './cache';

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
  stat: 'ok' | 'fail';
  error?: string;
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

class UptimeRobotError extends Error {
  constructor(
    message: string,
    public raw?: unknown
  ) {
    super(message);
    this.name = 'UptimeRobotError';
  }
}

export async function fetchMonitors(): Promise<UptimeRobotMonitor[]> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  
  if (!apiKey) {
    throw new Error('UPTIMEROBOT_API_KEY not configured');
  }

  const limit = 50;
  let allMonitors: UptimeRobotMonitorData[] = [];
  let offset = 0;
  let totalMonitors = 0;

  // Retrieve cache time from environment variables (in seconds)
  const cacheTimeStr = process.env.UPTIMEROBOT_DATA_CACHE_TIME || '600';
  const cacheTimeNum = parseInt(cacheTimeStr, 10);
  
  if (isNaN(cacheTimeNum) || cacheTimeNum <= 0) {
    console.warn(`Invalid UPTIMEROBOT_DATA_CACHE_TIME value: ${cacheTimeStr}. Falling back to default of 600 seconds.`);
  }
  
  const cacheTime = (!isNaN(cacheTimeNum) && cacheTimeNum > 0) ? cacheTimeNum : 600;

  try {
    do {
      const body = new URLSearchParams({
        api_key: apiKey,
        format: 'json',
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data: UptimeRobotResponse = await response.json();

      if (data.stat !== 'ok') {
        throw new UptimeRobotError(
          data.error || 'Failed to fetch monitors.',
          data
        );
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

    setCachedData('websites', { monitors, timestamp: Date.now() }, cacheTime);
    return monitors;
  } catch (error) {
    console.error('Error fetching monitors:', error);
    throw error;
  }
}

export async function newMonitor(params: NewMonitorParams): Promise<UptimeRobotResponse> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  
  if (!apiKey) {
    throw new Error('UPTIMEROBOT_API_KEY not configured');
  }

  const alertContactIds = await getAlertContactsByNames();
  
  // Format alert contacts with threshold and recurrence
  const formattedAlertContacts = alertContactIds
    .map(id => `${id}_0_0`)
    .join('-');

  const body = new URLSearchParams({
    api_key: apiKey,
    friendly_name: params.friendly_name,
    url: params.url,
    type: '2', // keyword
    keyword_type: '2',
    keyword_case_type: '1',
    keyword_value: params.keyword_value || '',
    interval: '60',
    timeout: '15',
    ignore_ssl_errors: '0',
    disable_domain_expire_notifications: '0',
    alert_contacts: formattedAlertContacts,
  });

  const response = await fetch('https://api.uptimerobot.com/v2/newMonitor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data: UptimeRobotResponse = await response.json();
  
  if (data.stat !== 'ok') {
    throw new UptimeRobotError(
      data.error || 'Failed to create new monitor',
      data
    );
  }

  return data;
}

export async function deleteMonitor(params: DeleteMonitorParams): Promise<UptimeRobotResponse> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  
  if (!apiKey) {
    throw new Error('UPTIMEROBOT_API_KEY not configured');
  }

  const body = new URLSearchParams({
    api_key: apiKey,
    id: String(params.id),
  });

  const response = await fetch('https://api.uptimerobot.com/v2/deleteMonitor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data: UptimeRobotResponse = await response.json();
  
  if (data.stat !== 'ok') {
    throw new UptimeRobotError(
      data.error || 'Failed to delete monitor',
      data
    );
  }

  return data;
}

export async function getAlertContactsByNames(): Promise<string[]> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  
  if (!apiKey) {
    throw new Error('UPTIMEROBOT_API_KEY not configured');
  }
  
  const contactNames = process.env.UPTIMEROBOT_ALERT_CONTACT_NAMES?.split(',').map(name => name.trim()) || [];

  if (!contactNames.length) {
    console.warn('No alert contact names specified in UPTIMEROBOT_ALERT_CONTACT_NAMES');
    return [];
  }

  try {
    const body = new URLSearchParams({
      api_key: apiKey,
      format: 'json'
    });

    const response = await fetch('https://api.uptimerobot.com/v2/getAlertContacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data: UptimeRobotResponse = await response.json();

    if (data.stat !== 'ok') {
      throw new UptimeRobotError(
        data.error || 'Failed to fetch alert contacts',
        data
      );
    }

    const matchingContacts = data.alert_contacts
      ?.filter(contact => contactNames.includes(contact.friendly_name))
      .map(contact => contact.id) || [];

    if (matchingContacts.length < contactNames.length) {
      const foundNames = data.alert_contacts
        ?.filter(contact => contactNames.includes(contact.friendly_name))
        .map(contact => contact.friendly_name) || [];
      const missingNames = contactNames.filter(name => !foundNames.includes(name));
      console.warn('Some alert contact names were not found:', missingNames);
    }

    return matchingContacts;
  } catch (error) {
    console.error('Error fetching alert contacts:', error);
    throw error;
  }
}
