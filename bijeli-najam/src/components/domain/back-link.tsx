"use client";

import { useRouter } from "next/navigation";

export function BackLink({
  fallback,
  label,
  className,
}: {
  fallback: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
      className={
        className ?? "text-sm text-muted-foreground hover:underline inline-block"
      }
    >
      {label}
    </button>
  );
}
