import { prisma } from "@/lib/db";

export async function writeAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  detail?: unknown,
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      detailJson: detail === undefined ? null : JSON.stringify(detail),
    },
  });
}
