import { completeVideoAction } from "@/lib/actions";
import { BottomCTA } from "@/components/ui/BottomCTA";
import { VideoPlayer } from "@/components/learning/VideoPlayer";
import { docHref } from "@/lib/documents";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatClock } from "@/lib/utils";
import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { canAccessNode } from "@/lib/progress";

export default async function VideoLessonPage({ params }: { params: Promise<{ nodeId: string }> }) {
  const user = await requireUser();
  const { nodeId } = await params;
  if (!(await canAccessNode(user.id, nodeId))) notFound();
  const node = await prisma.lessonNode.findUnique({
    where: { id: nodeId },
    include: { video: { include: { chapters: { orderBy: { orderIndex: "asc" } } } } },
  });
  if (!node?.video) notFound();

  const progress = await prisma.progressEvent.findUnique({
    where: { userId_nodeId: { userId: user.id, nodeId } },
  });
  const positionSec = progress?.lastPositionSec ?? null;
  const watchPct =
    positionSec !== null && node.video.durationSec > 0
      ? Math.min(100, Math.round((positionSec / node.video.durationSec) * 100))
      : 0;
  const showProgress = positionSec !== null && watchPct > 0 && !progress?.completed;

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex items-center gap-3 px-4 py-4">
        <Link href="/learn" className="text-sm font-bold text-[var(--muted)]">
          ← Lộ trình
        </Link>
      </div>
      <div className="flex-1 px-4">
        <h1 className="text-2xl font-extrabold">{node.title}</h1>
        <p className="mt-2 text-[var(--muted)]">{node.video.summary}</p>
        {showProgress && (
          <p className="mt-2 text-sm font-bold text-[var(--brand)]">
            Đã xem {watchPct}% · dừng ở {formatClock(positionSec)}
          </p>
        )}
        <div className="mt-5 overflow-hidden rounded-[24px] border border-[var(--line)] bg-black shadow-[var(--shadow-card)]">
          <VideoPlayer
            nodeId={node.id}
            videoUrl={node.video.videoUrl}
            chapters={node.video.chapters.map((c) => ({ title: c.title, startSec: c.startSec }))}
            initialPositionSec={positionSec}
          />
        </div>
        {node.video.pdfUrl && (
          <Link
            href={docHref(node.video.pdfUrl)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border-2 border-b-4 border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[#3c3c3c] transition-all hover:bg-[var(--surface)] active:translate-y-[2px] active:border-b-2"
          >
            <FileText className="size-4 text-[var(--brand)]" />
            Tài liệu PDF đính kèm
          </Link>
        )}
      </div>
      <form action={completeVideoAction.bind(null, nodeId)}>
        <BottomCTA primaryLabel="Đánh dấu đã hoàn thành" />
      </form>
    </main>
  );
}
