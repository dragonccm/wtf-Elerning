import { completeVideoAction } from "@/lib/actions";
import { BottomCTA } from "@/components/ui/BottomCTA";
import { docHref } from "@/lib/documents";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function VideoLessonPage({ params }: { params: Promise<{ nodeId: string }> }) {
  await requireUser();
  const { nodeId } = await params;
  const node = await prisma.lessonNode.findUnique({
    where: { id: nodeId },
    include: { video: true },
  });
  if (!node?.video) notFound();

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
        <div className="mt-5 overflow-hidden rounded-[24px] border border-[var(--line)] bg-black shadow-[var(--shadow-card)]">
          <video className="aspect-video w-full" controls src={node.video.videoUrl} />
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
