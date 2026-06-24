import { NextAuthOptions } from "next-auth"
import EveOnlineProvider from "next-auth/providers/eveonline"
import { getConfig } from "@/lib/config"

export const authOptions: NextAuthOptions = {
  providers:[
    EveOnlineProvider({
      clientId: process.env.EVE_CLIENT_ID!,
      clientSecret: process.env.EVE_CLIENT_SECRET!,
      authorization: {
        url: "https://login.eveonline.com/v2/oauth/authorize",
        params: {
          scope: "publicData esi-fleets.read_fleet.v1 esi-fleets.write_fleet.v1 esi-fleets.read_character_fleet.v1"
        }
      }
    })
  ],
  useSecureCookies: process.env.NODE_ENV === "production" && (process.env.NEXTAUTH_URL?.startsWith("https://") || !!process.env.VERCEL_URL),
  callbacks: {
    async signIn({ account }) {
      if (account?.provider === "eveonline") {
        const charId = account.providerAccountId; 
        const res = await fetch(`https://esi.evetech.net/latest/characters/${charId}/`);
        if (!res.ok) return false;
        const data = await res.json();
        
        const config = getConfig();
        const allowed = config.allowed;
        
        if (!allowed) return false;
        
        const allowedAlliances = (allowed.alliance_id || []).map(String);
        const allowedCorps = (allowed.corporation_id || []).map(String);
        const allowedChars = (allowed.character_id || []).map(String);
        
        if (allowedAlliances.length === 0 && allowedCorps.length === 0 && allowedChars.length === 0) {
          return false; 
        }
        
        if (data.alliance_id && allowedAlliances.includes(String(data.alliance_id))) return true;
        if (data.corporation_id && allowedCorps.includes(String(data.corporation_id))) return true;
        if (charId && allowedChars.includes(String(charId))) return true;
        
        return false;
      }
      return false;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.characterId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.characterId = token.characterId as string;
      return session;
    }
  }
}
