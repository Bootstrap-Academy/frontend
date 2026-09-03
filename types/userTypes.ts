export class User {
  admin: boolean = false;
  business: boolean = false;
  can_buy_coins: boolean = false;
  can_receive_coins: boolean = false;
  city: string = "";
  country: string = "";
  description: string = "";
  display_name: string = "";
  email: string = "";
  email_verified: boolean = false;
  first_name: string = "";
  id: string = "";
  last_login: number = 0;
  last_name: string = "";
  last_name_change: number = 0;
  mfa_enabled: boolean = false;
  name: string = "";
  password: boolean = false;
  registration: number = 0;
  street: string = "";
  tags: unknown[] = [];
  terms_version: null | string = null;
  terms_accepted_at: null | number = null;
  terms_declined_at: null | number = null;
  vat_id: null | unknown = null;
  zip_code: string = "";
}
