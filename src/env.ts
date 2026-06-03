import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  DIRECT_DATABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

const parsedServer = serverSchema.safeParse(process.env);
const parsedPublic = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsedServer.success) {
  console.warn("[env] Server env invalid:", parsedServer.error.flatten().fieldErrors);
}
if (!parsedPublic.success) {
  console.warn("[env] Public env invalid:", parsedPublic.error.flatten().fieldErrors);
}

export const env = {
  ...(parsedServer.success ? parsedServer.data : {}),
  ...(parsedPublic.success ? parsedPublic.data : {}),
} as z.infer<typeof serverSchema> & z.infer<typeof publicSchema>;
