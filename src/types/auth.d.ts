export interface AuthUser {
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface TokenPayload {
  sub: string;
  email: string;
  v: number;
}
