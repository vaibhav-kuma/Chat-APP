import type { Prisma } from "@prisma/client";
import type { Request } from "express";
import { prisma } from "../prisma.js";

interface AuditInput {
  adminId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  req?: Request;
}

export async function audit(input: AuditInput): Promise<void> {
  const { adminId, action, entityType, entityId, metadata, req } = input;
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        metadata,
        ip: req?.ip ?? undefined,
        userAgent: req?.get("user-agent") ?? undefined,
      },
    });
  } catch (err) {
    // Audit must never break the primary operation
    console.error("[audit] failed:", err);
  }
}
