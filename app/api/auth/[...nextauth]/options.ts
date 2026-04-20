import { NextAuthOptions } from "next-auth"
import EveOnlineProvider from "next-auth/providers/eveonline"

export const authOptions: NextAuthOptions = {
  providers:[
    EveOnlineProvider({
      clientId: process.env.EVE_CLIENT_ID!,
      clientSecret: process.env.EVE_CLIENT_SECRET!,
      authorization: {
        url: "https://login.eveonline.com/v2/oauth/authorize",
        params: {
          scope: "publicData esi-fleets.read_fleet.v1 esi-fleets.write_fleet.v1"
        }
      }
    })
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider === "eveonline") {
        const charId = account.providerAccountId; 
        const res = await fetch(`https://esi.evetech.net/latest/characters/${charId}/`);
        if (!res.ok) return false;
        const data = await res.json();
        
        // Strict alliance check
        if (data.alliance_id?.toString() !== process.env.ALLOWED_ALLIANCE_ID) {
          return false; 
        }
        return true;
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
