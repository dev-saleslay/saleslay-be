import { prisma } from "@/lib/prisma";

export async function findCrmLeadIdByEmailForUser(
  userId: string,
  emailNormalized: string,
): Promise<{ id: string; firstName: string | null; lastName: string | null; company: string | null } | null> {
  const leads = await prisma.crmLead.findMany({
    where: { userId },
    select: { id: true, email: true, firstName: true, lastName: true, company: true },
  });
  const hit = leads.find((l) => l.email?.trim().toLowerCase() === emailNormalized);
  if (!hit) return null;
  return {
    id: hit.id,
    firstName: hit.firstName,
    lastName: hit.lastName,
    company: hit.company,
  };
}
