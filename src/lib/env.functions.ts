import { makeEnvFunction } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Centralized environment variables and validation.
 */
export const env = makeEnvFunction({
  VITE_NEON_AUTH_URL: z.string().url(),
});
