import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __beatboard_pg: ReturnType<typeof postgres> | undefined;
}

const connectionString = env.DATABASE_URL;

const queryClient =
  global.__beatboard_pg ??
  (connectionString ? postgres(connectionString, { prepare: false, max: 5 }) : undefined);

if (process.env.NODE_ENV !== "production" && queryClient) {
  global.__beatboard_pg = queryClient;
}

export const db = queryClient
  ? drizzle(queryClient, { schema, logger: process.env.NODE_ENV !== "production" })
  : null;

export { schema };
