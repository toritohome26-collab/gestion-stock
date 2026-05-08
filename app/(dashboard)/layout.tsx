import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { AlertBanner } from "@/components/layout/AlertBanner";
import prisma from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const orgId = (session.user as any).organizationId;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { alertMessage: true, alertSentAt: true },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {org?.alertMessage && <AlertBanner message={org.alertMessage} />}
        {children}
      </main>
    </div>
  );
}
