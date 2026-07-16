import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";

export async function logAudit(params: {
  orgId: number;
  userId: number;
  action: string;
  resourceType?: string;
  resourceId?: number;
  resourceName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogsTable).values({
      orgId: params.orgId,
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceName: params.resourceName,
      details: params.details ?? {},
      ipAddress: params.ipAddress,
    });
  } catch {
    // Non-blocking, audit failures shouldn't break operations
  }
}
