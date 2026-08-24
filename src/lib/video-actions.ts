"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

/**
 * Save video playback position (resume) + optionally correct the stored duration.
 * Never marks the node completed — completion only happens via completeVideoAction.
 *
 * FormData fields:
 * - nodeId: string (required)
 * - positionSec: string seconds (optional — when omitted, only duration is corrected)
 * - measuredDurationSec: string seconds (optional — real duration from <video> metadata)
 */
export async function saveVideoPositionAction(formData: FormData) {
  const user = await requireUser();
  const nodeId = String(formData.get("nodeId") || "");
  if (!nodeId) return;

  const positionRaw = String(formData.get("positionSec") ?? "").trim();
  const positionSec = positionRaw === "" ? null : Number(positionRaw);
  if (positionSec !== null && (!Number.isFinite(positionSec) || positionSec < 0)) return;

  if (positionSec !== null) {
    await prisma.progressEvent.upsert({
      where: { userId_nodeId: { userId: user.id, nodeId } },
      create: {
        userId: user.id,
        nodeId,
        completed: false,
        timeSpentSec: Math.floor(positionSec),
        lastPositionSec: Math.floor(positionSec),
        lastWatchedAt: new Date(),
      },
      update: {
        lastPositionSec: Math.floor(positionSec),
        lastWatchedAt: new Date(),
      },
    });
  }

  const measuredRaw = String(formData.get("measuredDurationSec") ?? "").trim();
  const measured = measuredRaw === "" ? null : Number(measuredRaw);
  if (measured !== null && Number.isFinite(measured) && measured > 5) {
    const video = await prisma.lessonVideo.findUnique({ where: { nodeId } });
    const normalized = Math.round(measured);
    if (video && Math.abs(video.durationSec - normalized) / normalized > 0.05) {
      await prisma.lessonVideo.update({
        where: { id: video.id },
        data: { durationSec: normalized },
      });
    }
  }
}
