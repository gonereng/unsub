import type { OAuthConfig } from "next-auth/providers/index";

export const googleProvider: OAuthConfig<{
  sub: string;
  email: string;
  name: string;
  picture: string;
}> = {
  id: "google",
  name: "Google",
  type: "oauth",
  authorization: {
    url: "https://accounts.google.com/o/oauth2/v2/auth",
    params: {
      scope:
        "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.settings.basic https://www.googleapis.com/auth/gmail.labels",
      access_type: "offline",
      prompt: "consent",
    },
  },
  token: "https://oauth2.googleapis.com/token",
  userinfo: "https://www.googleapis.com/oauth2/v3/userinfo",
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  profile(profile) {
    return {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      image: profile.picture,
    };
  },
};

export const microsoftProvider: OAuthConfig<{
  id: string;
  mail: string;
  userPrincipalName: string;
  displayName: string;
}> = {
  id: "microsoft",
  name: "Microsoft",
  type: "oauth",
  authorization: {
    url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    params: {
      scope: "openid email profile Mail.Read Mail.ReadWrite offline_access",
    },
  },
  token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  userinfo: "https://graph.microsoft.com/v1.0/me",
  clientId: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  profile(profile) {
    return {
      id: profile.id,
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName,
      image: null,
    };
  },
};
