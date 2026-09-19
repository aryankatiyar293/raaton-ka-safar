import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("music persistence contract", () => {
  it("rejects invalid visitor keys before touching the database", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.music.preferences.get({ visitorKey: "too-short" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects invalid preference values before touching the database", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.music.preferences.save({
      visitorKey: "visitor-key-that-is-long-enough",
      currentTrackId: "01",
      favoriteTrackIds: [],
      volume: 120,
      muted: false,
      repeatMode: "off",
      shuffleEnabled: false,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
