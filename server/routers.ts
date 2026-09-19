import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getListenerPreferences, getSiteSettings, incrementPlayCount, listTracks, upsertListenerPreferences } from "./db";

const preferencesInput = z.object({
  visitorKey: z.string().min(16).max(64),
  currentTrackId: z.string().min(1).max(32),
  favoriteTrackIds: z.array(z.string().min(1).max(32)).max(100),
  volume: z.number().int().min(0).max(100),
  muted: z.boolean(),
  repeatMode: z.enum(["off", "one", "all"]),
  shuffleEnabled: z.boolean(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  music: router({
    tracks: publicProcedure.query(() => listTracks({ publishedOnly: true })),
    settings: publicProcedure.query(() => getSiteSettings()),
    play: publicProcedure.input(z.object({ trackId: z.string().min(1).max(32) })).mutation(({ input }) => incrementPlayCount(input.trackId)),
    preferences: router({
      get: publicProcedure.input(z.object({ visitorKey: z.string().min(16).max(64) })).query(({ input }) => getListenerPreferences(input.visitorKey)),
      save: publicProcedure.input(preferencesInput).mutation(({ input }) => upsertListenerPreferences({
        visitorKey: input.visitorKey,
        currentTrackId: input.currentTrackId,
        favoriteTrackIds: JSON.stringify(input.favoriteTrackIds),
        volume: input.volume,
        muted: input.muted ? 1 : 0,
        repeatMode: input.repeatMode,
        shuffleEnabled: input.shuffleEnabled ? 1 : 0,
      })),
    }),
  }),
});

export type AppRouter = typeof appRouter;
