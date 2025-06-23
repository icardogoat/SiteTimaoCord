import { AdminLayout } from "@/components/admin-layout";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
    return <AdminLayout>{children}</AdminLayout>;
}
