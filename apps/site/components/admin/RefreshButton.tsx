"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton({ label = "Refresh" }: { label?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="payload-button payload-button--ghost payload-refresh-button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      type="button"
    >
      <RefreshCw className={isPending ? "payload-refresh-icon is-spinning" : "payload-refresh-icon"} size={16} />
      {isPending ? "Refreshing" : label}
    </button>
  );
}
