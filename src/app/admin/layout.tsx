import type { Metadata } from "next";

import { AdminChrome } from "./admin-chrome";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full flex-1 bg-zinc-100 text-zinc-900">
      <AdminChrome>{children}</AdminChrome>
    </div>
  );
}
