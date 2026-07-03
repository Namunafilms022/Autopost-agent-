export interface ProviderToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface ProviderAccount {
  account_id: string;
  account_name: string;
}

export interface SocialProvider {
  exchangeCode(code: string, redirectUri: string, codeVerifier?: string): Promise<ProviderToken>;
  getAccount(token: ProviderToken): Promise<ProviderAccount>;
  refreshToken(token: string): Promise<ProviderToken>;
  publish(): never;
}
