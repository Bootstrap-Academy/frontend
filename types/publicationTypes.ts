export type ProfileVisibility = "private" | "shared";

export interface PublicationSettings {
  profile_visibility: ProfileVisibility;
  visibility_revision: number;
}

export interface PublicationChoice {
  profile_visibility: ProfileVisibility;
  expected_revision: number;
  request_id: string;
  scope_version?: string;
  notice_hash?: string;
  preview_token?: string;
}

export interface PublicationCard {
  display_name: string;
  total_xp: number;
}

export interface PublicationPreview {
  profile: { user_id: string; display_name: string; avatar_url: null };
  publication: PublicationSettings;
  scope_version: string;
  notice_hash: string;
  notice: string;
  preview_token: string;
  card: PublicationCard;
}

export interface PublicationView {
  settings: PublicationSettings | null;
  preview: PublicationPreview | null;
  busy: boolean;
  error: string;
  success: string;
  uncertain: boolean;
}
