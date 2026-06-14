import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({ path: z.string().min(1).max(500) });

export const getProofSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    // Allow if owner of file or manager
    const ownsPath = data.path.startsWith(`${context.userId}/`);
    let allowed = ownsPath;
    if (!allowed) {
      const { data: isMgr } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "manager",
      });
      allowed = !!isMgr;
    }
    if (!allowed) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("proof-files")
      .createSignedUrl(data.path, 60 * 10);
    if (error || !signed) throw new Error(error?.message || "Could not sign URL");
    return { url: signed.signedUrl };
  });
