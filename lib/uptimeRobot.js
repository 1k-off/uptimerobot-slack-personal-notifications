import fetch from 'node-fetch';
import { setCachedData } from './cache';

export async function fetchMonitors() {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;

  const limit = 50;
  let allMonitors = [];
  let offset = 0;
  let totalMonitors = 0;

  // Retrieve cache time from environment variables (in seconds)
  const cacheTimeStr = process.env.UPTIMEROBOT_DATA_CACHE_TIME || '600'; // Default to 600 seconds (10 minutes)
  const cacheTimeNum = parseInt(cacheTimeStr, 10);
  // Check if cacheTime is a valid number
  if (isNaN(cacheTimeNum) || cacheTimeNum <= 0) {
    console.warn(`Invalid UPTIMEROBOT_DATA_CACHE_TIME value: ${cacheTimeStr}. Falling back to default of 600 seconds.`);
  }
  const cacheTime = (!isNaN(cacheTimeNum) && cacheTimeNum > 0) ? cacheTimeNum : 600; // Default to 600 seconds if invalid

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

      const data = await response.json();

      if (data.stat !== 'ok') {
        throw {
          message: data.error || 'Failed to fetch monitors.',
          raw: data,
        };
      }

      totalMonitors = data.monitors.length;
      allMonitors = allMonitors.concat(data.monitors);
      offset += limit;
    } while (totalMonitors === limit);

    const monitors = allMonitors.map((monitor) => ({
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

export async function newMonitor({ friendly_name, url, keyword_value }) {
  const alertContactIds = await getAlertContactsByNames();
  
  const apiKey = process.env.UPTIMEROBOT_API_KEY;

  // Format alert contacts with threshold and recurrence
  // Format: id_threshold_recurrence
  // Multiple contacts separated by dash (-)
  const formattedAlertContacts = alertContactIds
    .map(id => `${id}_0_0`)  // Adding threshold=0, recurrence=0 for free plan
    .join('-');

  const body = new URLSearchParams({
    api_key: apiKey,
    friendly_name,
    url,
    type: '2', // keyword
    keyword_type: '2',
    keyword_case_type: '1',
    keyword_value,
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

  const data = await response.json();
  if (data.stat !== 'ok') {
    throw {
      message: data.error || 'Failed to create new monitor',
      raw: data,
    };
  }

  return data;
}

export async function deleteMonitor({ id }) {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;

  const body = new URLSearchParams({
    api_key: apiKey,
    id: String(id),
  });

  const response = await fetch('https://api.uptimerobot.com/v2/deleteMonitor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();
  if (data.stat !== 'ok') {
    throw {
      message: data.error || 'Failed to delete monitor',
      raw: data,
    };
  }

  return data;
}

export async function getAlertContactsByNames() {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
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

    const data = await response.json();

    if (data.stat !== 'ok') {
      throw {
        message: data.error || 'Failed to fetch alert contacts',
        raw: data,
      };
    }

    // Filter alert contacts by the names specified in env
    const matchingContacts = data.alert_contacts
      .filter(contact => contactNames.includes(contact.friendly_name))
      .map(contact => contact.id);

    if (matchingContacts.length < contactNames.length) {
      const foundNames = data.alert_contacts
        .filter(contact => contactNames.includes(contact.friendly_name))
        .map(contact => contact.friendly_name);
      const missingNames = contactNames.filter(name => !foundNames.includes(name));
      console.warn('Some alert contact names were not found:', missingNames);
    }

    return matchingContacts;
  } catch (error) {
    console.error('Error fetching alert contacts:', error);
    throw error;
  }
}
