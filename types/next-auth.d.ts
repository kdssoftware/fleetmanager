import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken: string
    refreshToken: string
    characterId: string
    user: {} & DefaultSession["user"]
  }
}
