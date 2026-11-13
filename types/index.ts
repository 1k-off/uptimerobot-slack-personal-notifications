// Common types for the application

export interface Website {
  id: number;
  friendly_name: string;
  url: string;
  type?: number;
  status?: number;
  alertContacts?: {
    slack: {
      users: string[];
      channels: string[];
    };
  };
  group?: {
    _id: string;
    name: string;
  };
  friendlyName?: string;
  createdBy?: string;
  updatedBy?: string;
  notificationPreferences?: {
    downAlerts: boolean;
    upAlerts: boolean;
    latencyAlerts: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SlackUser {
  id: string;
  name: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  isClosed?: boolean;
}

export interface Group {
  _id: string;
  name: string;
  websites?: number[];
  createdAt?: Date;
}

export interface MonitorFormProps {
  action: 'newMonitor' | 'deleteMonitor';
  onClose: () => void;
  monitorId?: number;
  websiteUrl?: string;
  websiteName?: string;
}

export interface UptimeRobotMonitor {
  id: number;
  friendly_name: string;
  url: string;
  type: number;
  status: number;
}

export interface WebhookData {
  monitorID: string;
  monitorURL: string;
  monitorFriendlyName: string;
  alertType: string;
  alertTypeFriendlyName: string;
  alertDetails?: string;
  alertDuration?: string;
  alertDateTime: string;
  sslExpiryDate?: string;
  sslExpiryDaysLeft?: string;
}

export interface SlackMessageData {
  monitorURL: string;
  monitorFriendlyName: string;
  alertType: string;
  alertTypeFriendlyName: string;
  alertDetails?: string;
  alertDuration?: string;
  alertDateTime: string;
  sslExpiryDate?: string;
  sslExpiryDaysLeft?: string;
}

// NextAuth types
export interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    roles: string[];
    groups: string[];
    isAdmin: boolean;
    isAccessManager: boolean;
  };
  expires: string;
}

export interface AccessProject {
  id: number;
  name: string;
}

export interface AccessRecord {
  id: number;
  name: string;
  userId: number;
  userName?: string | null;
  projectId: number | null;
  projectName?: string | null;
  givenBy?: string | null;
  requestTicket?: string | null;
  url?: string | null;
  dateMod?: string | null;
}

export interface ProjectAutocompleteProps {
  value: AccessProject | null;
  onChange: (project: AccessProject | null) => void;
}

// API Response types
export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string | object;
}

export interface MultiSelectDropdownProps {
  apiEndpoint: string;
  placeholder: string;
  selectedPlaceholder: string;
  labelKey?: string;
  idKey?: string;
  selectedItems: string[];
  setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>;
  onItemsLoaded?: (items: any[]) => void;
}

export interface GroupAutocompleteProps {
  value: Group | null;
  onChange: (group: Group | null) => void;
  websiteId: number;
}

export interface AlertModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

// Message types
export interface MessageRecord {
  messageId: string;
  channelId: string;
  threadTs?: string;
  websiteId: number;
  groupId?: string;
  alertType: string;
}

export interface Message extends Omit<MessageRecord, 'messageId'> {
  _id: string;
  messageId: string;
  createdAt: Date;
  updatedAt: Date;
  websiteUrl?: string;
  websiteName?: string;
} 