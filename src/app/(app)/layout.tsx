import type { ReactNode } from "react";

import { AppChrome } from "@/components/layout/app-chrome";

export default function AuthenticatedAppLayout({ children }: { children: ReactNode }) {
  return <AppChrome>{children}</AppChrome>;
}
