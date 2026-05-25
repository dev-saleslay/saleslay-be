import { phonesMatch } from "@/lib/messaging/phone-match";
import { prisma } from "@/lib/prisma";

export async function findCrmLeadIdByPhoneForUser(
  userId: string,
  fromPhoneRaw: string,
): Promise<{ id: string; firstName: string | null; lastName: string | null; company: string | null } | null> {
  const leads = await prisma.crmLead.findMany({
    where: { userId },
    select: { id: true, phone: true, firstName: true, lastName: true, company: true },
  });
  const hit = leads.find((l) => l.phone?.trim() && phonesMatch(l.phone, fromPhoneRaw));
  if (!hit) return null;
  return {
    id: hit.id,
    firstName: hit.firstName,
    lastName: hit.lastName,
    company: hit.company,
  };
}
