"use client";

import { usePathname } from "next/navigation";
import AppHeader from "./app-header";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const HIDDEN_PATHS = [
  "/login",
  "/forgot-password",
];

export default function HeaderVisibility({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status, data: session } = useSession();
  const router = useRouter();

  // If not loading, not on a hidden path, and not authenticated, redirect to /login
  useEffect(() => {
    if (
      status === "unauthenticated" &&
      pathname &&
      !HIDDEN_PATHS.some((path) => pathname.startsWith(path))
    ) {
      router.replace("/login");
    }
  }, [status, pathname, router]);

  // Hide header if loading, on a hidden path, or not authenticated
  const hideHeader =
    status === "loading" ||
    !pathname ||
    HIDDEN_PATHS.some((path) => pathname.startsWith(path)) ||
    status === "unauthenticated";

  return (
    <>
      {!hideHeader && <AppHeader />}
      {children}
    </>
  );
}
