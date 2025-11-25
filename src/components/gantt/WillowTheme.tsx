"use client";

import type { ReactNode } from "react";
import { Willow } from "@svar-ui/react-gantt";

export function WillowTheme({ children, fonts = true }: { children: ReactNode; fonts?: boolean }) {
  return <Willow fonts={fonts}>{children}</Willow>;
}






