import type { Session } from "next-auth";

export interface SessionWithToken extends Session {
  accessToken?: string;
  provider?: string;
}
