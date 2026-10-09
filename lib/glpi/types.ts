export interface GlpiRef {
  id: number;
  name?: string | null;
}

export interface GlpiUser {
  id: number;
  username?: string | null;
  realname?: string | null;
  firstname?: string | null;
  is_active?: boolean;
  is_deleted?: boolean;
  emails?: Array<{ email?: string | null }>;
}

export interface GlpiProject {
  id: number;
  name: string;
  comment?: string | null;
  is_deleted?: boolean;
}

export interface GlpiAccessCustomFields {
  given_by?: string | null;
  projects?: string | null;
  request_ticket?: string | null;
  url?: string | null;
}

export interface GlpiAccess {
  id: number;
  name: string;
  comment?: string | null;
  is_deleted?: boolean;
  date_creation?: string | null;
  date_mod?: string | null;
  user?: GlpiRef | null;
  custom_fields?: GlpiAccessCustomFields | null;
}

export interface CreateGlpiAccessInput {
  name: string;
  userId: number;
  projectId: number;
  givenBy?: string;
  requestTicket?: string;
  url?: string;
  comment?: string;
}

export interface UpdateGlpiAccessInput {
  name?: string;
  userId?: number;
  projectId?: number;
  givenBy?: string;
  requestTicket?: string;
  url?: string;
  comment?: string;
}
