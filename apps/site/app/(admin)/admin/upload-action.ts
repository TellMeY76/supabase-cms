"use server";

import { createCookieSupabaseClient, requireAdminSession } from "@/lib/auth";
import { uploadAdminMedia } from "@/lib/media-storage";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function uploadFileAction(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  await requireAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "File is required." };
  }

  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const supabase = await createCookieSupabaseClient();
  try {
    const uploaded = await uploadAdminMedia({ supabase, file });
    return { url: uploaded.publicUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Upload failed." };
  }
}
