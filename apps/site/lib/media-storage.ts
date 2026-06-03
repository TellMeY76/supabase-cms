import type { MediaUploadProvider } from "@global-trade/core";
import type { createCookieSupabaseClient } from "./auth";

type SupabaseClient = Awaited<ReturnType<typeof createCookieSupabaseClient>>;

export interface AdminMediaUploadInput {
  supabase: SupabaseClient;
  file: File;
  alt?: string | null | undefined;
  title?: string | null | undefined;
}

export interface AdminMediaUploadResult {
  provider: MediaUploadProvider;
  storagePath: string;
  publicUrl: string;
}

export function getMediaUploadProvider(): MediaUploadProvider {
  const envProvider = process.env.MEDIA_UPLOAD_PROVIDER?.trim();
  if (envProvider === "supabase" || envProvider === "ali_oss") return envProvider;
  return "supabase";
}

export async function uploadAdminMedia(input: AdminMediaUploadInput): Promise<AdminMediaUploadResult> {
  const provider = getMediaUploadProvider();
  if (provider === "ali_oss") return uploadToAliOss(input);
  return uploadToSupabase(input);
}

async function uploadToSupabase({ supabase, file, alt, title }: AdminMediaUploadInput): Promise<AdminMediaUploadResult> {
  const bucket = process.env.SUPABASE_MEDIA_BUCKET?.trim() || "media";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `admin/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const publicUrl = data.publicUrl;
  await insertMediaAsset({
    supabase,
    provider: "supabase",
    storagePath,
    publicUrl,
    file,
    alt,
    title
  });

  return { provider: "supabase", storagePath, publicUrl };
}

async function uploadToAliOss(_input: AdminMediaUploadInput): Promise<AdminMediaUploadResult> {
  throw new Error(
    "Ali OSS upload is reserved but not enabled yet. Keep MEDIA_UPLOAD_PROVIDER=supabase until the OSS adapter and credentials are configured."
  );
}

async function insertMediaAsset({
  supabase,
  provider,
  storagePath,
  publicUrl,
  file,
  alt,
  title
}: AdminMediaUploadInput & AdminMediaUploadResult) {
  const { error } = await supabase.from("media_assets").insert({
    kind: "local",
    storage_path: storagePath,
    public_url: publicUrl,
    source: { type: "admin-upload", provider },
    alt: alt || null,
    title: title || null,
    mime_type: file.type || null
  });
  if (error) throw new Error(error.message);
}
