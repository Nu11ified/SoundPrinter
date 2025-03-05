import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { audioFingerprints } from "../../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { calculateSimilarity } from "~/lib/audio";
import { type AudioMatch } from "~/types/audio";

export const audioRouter = createTRPCRouter({
  createFingerprint: publicProcedure
    .input(
      z.object({
        name: z.string(),
        fingerprint: z.string(),
        duration: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(audioFingerprints)
        .values({
          name: input.name,
          fingerprint: input.fingerprint,
          duration: input.duration,
        })
        .returning();
      return result[0];
    }),

  identifyAudio: publicProcedure
    .input(
      z.object({
        fingerprint: z.string(),
        minSimilarity: z.number().optional().default(0.7),
      })
    )
    .query(async ({ ctx, input }) => {
      const allFingerprints = await ctx.db.select().from(audioFingerprints);
      
      const matches: AudioMatch[] = allFingerprints
        .map((record) => {
          const similarity = calculateSimilarity(input.fingerprint, record.fingerprint);
          return {
            id: record.id,
            name: record.name,
            duration: record.duration,
            similarity,
          };
        })
        .filter((match) => match.similarity >= input.minSimilarity)
        .sort((a, b) => b.similarity - a.similarity);

      return matches;
    }),

  getAllFingerprints: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(audioFingerprints);
  }),
}); 