import { ProgressBar } from "@/components/ui/ProgressBar";
import { LiveRoom } from "@/components/live/LiveRoom";
import { getStudentAssignments } from "@/lib/classroom";
import { prisma } from "@/lib/db";
import { activityHref } from "@/lib/progress";
import { requireUser } from "@/lib/session";
import { cn, deadlineLabel, formatDateTime } from "@/lib/utils";
import type { NodeType } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Circle, ExternalLink, FileText, Video } from "lucide-react";

type AssignmentRow = Awaited<ReturnType<typeof getStudentAssignments>>[number];

const TABS = [
  { key: "todo", label: "Bài cần làm" },
  { key: "done", label: "Đã nộp" },
  { key: "materials", label: "Tài liệu" },
  { key: "announcements", label: "Thông báo" },
  { key: "live", label: "Lớp trực tiếp" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Empty({ text }: { text: string }) {
  return <div className="md-card p-10 text-center text-[var(--md-on-surface-variant)]">{text}</div>;
}

function DeadlineChip({ dueAt }: { dueAt: Date }) {
  const label = deadlineLabel(dueAt);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold",
        label === "Đã quá hạn"
          ? "bg-[#fde8e8] text-[#ba1a1a]"
          : "bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]",
      )}
    >
      {label}
    </span>
  );
}

function TodoCard({
  assignment,
  completedNodes,
}: {
  assignment: AssignmentRow;
  completedNodes: Set<string>;
}) {
  const overdue = deadlineLabel(assignment.dueAt) === "Đã quá hạn";
  const percent = assignment.total > 0 ? (assignment.doneCount / assignment.total) * 100 : 0;
  return (
    <article className="md-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold leading-snug">{assignment.title}</h3>
          {assignment.description && (
            <p className="mt-1 text-sm leading-relaxed text-[var(--md-on-surface-variant)]">
              {assignment.description}
            </p>
          )}
        </div>
        <DeadlineChip dueAt={assignment.dueAt} />
      </div>
      <p className="mt-2 text-sm font-bold">Hạn chót: {formatDateTime(assignment.dueAt)}</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="shrink-0 text-sm font-extrabold text-[var(--md-primary)]">
          {assignment.doneCount}/{assignment.total} bài
        </span>
        <ProgressBar value={percent} tone={overdue ? "danger" : "brand"} className="flex-1" />
      </div>
      <ul className="mt-4 space-y-2">
        {assignment.nodes.map((n) => {
          const done = completedNodes.has(n.nodeId);
          return (
            <li key={n.nodeId}>
              <Link
                href={activityHref(n.node.type as NodeType, n.node.id)}
                className="flex items-center gap-3 rounded-xl border border-[var(--md-outline-variant)] bg-white/80 px-3.5 py-2.5 transition hover:border-[var(--md-primary)] hover:bg-white"
              >
                {done ? (
                  <Check className="size-5 shrink-0 text-[var(--md-primary)]" strokeWidth={3} />
                ) : (
                  <Circle className="size-5 shrink-0 text-[var(--md-outline)]" />
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm font-bold",
                    done && "text-[var(--md-on-surface-variant)] line-through",
                  )}
                >
                  {n.node.title}
                </span>
                <span className="hidden shrink-0 text-xs font-bold text-[var(--md-on-surface-variant)] sm:block">
                  {n.node.unit.title}
                </span>
                <ArrowRight className="size-4 shrink-0 text-[var(--md-primary)]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default async function StudentClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const user = await requireUser();
  const { classroomId } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: TabKey =
    rawTab === "done" || rawTab === "materials" || rawTab === "announcements" || rawTab === "live"
      ? rawTab
      : "todo";

  const membership = await prisma.classroomMember.findUnique({
    where: { classroomId_userId: { classroomId, userId: user.id } },
  });
  if (!membership) redirect("/classes");

  const [classroom, assignments] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id: classroomId },
      include: { course: true, teacher: { select: { name: true } } },
    }),
    getStudentAssignments(classroomId, user.id),
  ]);
  if (!classroom) redirect("/classes");

  const todo = assignments.filter((a) => a.studentStatus === "TO_DO");
  const done = assignments.filter((a) => a.studentStatus === "TURNED_IN" || a.studentStatus === "LATE");

  let completedNodes = new Set<string>();
  if (tab === "todo") {
    const nodeIds = todo.flatMap((a) => a.nodes.map((n) => n.nodeId));
    const events = nodeIds.length
      ? await prisma.progressEvent.findMany({
          where: { userId: user.id, nodeId: { in: nodeIds }, completed: true },
          select: { nodeId: true },
        })
      : [];
    completedNodes = new Set(events.map((e) => e.nodeId));
  }

  const materials =
    tab === "materials"
      ? await prisma.classMaterial.findMany({
          where: { classroomId },
          include: { mediaAsset: true, addedBy: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : [];
  const announcements =
    tab === "announcements"
      ? await prisma.announcement.findMany({
          where: { classroomId },
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : [];
  const sessions =
    tab === "live"
      ? await prisma.classSession.findMany({
          where: { classroomId, status: "SCHEDULED" },
          orderBy: { startsAt: "asc" },
        })
      : [];

  const counts: Partial<Record<TabKey, number>> = { todo: todo.length, done: done.length };

  return (
    <main className="staff-theme mx-auto w-full max-w-3xl px-5 py-8 lg:px-8">
      <header>
        <Link
          href="/classes"
          className="inline-flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide text-[var(--md-primary)]"
        >
          <ArrowRight className="size-4 rotate-180" /> Lớp của tôi
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="md-chip">{classroom.status}</span>
            <h1 className="mt-2 text-3xl font-extrabold">{classroom.name}</h1>
            <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
              {classroom.course.title} · GV {classroom.teacher?.name ?? "Chưa gán"}
            </p>
          </div>
        </div>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/classes/${classroomId}?tab=${t.key}`}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-extrabold transition",
              tab === t.key
                ? "bg-[var(--md-primary)] text-[var(--md-on-primary)]"
                : "bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]",
            )}
          >
            {t.label}
            {counts[t.key] != null ? ` (${counts[t.key]})` : ""}
          </Link>
        ))}
      </nav>

      <section className="mt-6">
        {tab === "todo" &&
          (todo.length === 0 ? (
            <Empty text="Chưa có bài tập nào." />
          ) : (
            <div className="grid gap-4">
              {todo.map((a) => (
                <TodoCard key={a.id} assignment={a} completedNodes={completedNodes} />
              ))}
            </div>
          ))}

        {tab === "done" &&
          (done.length === 0 ? (
            <Empty text="Chưa có bài nào được nộp." />
          ) : (
            <div className="grid gap-4">
              {done.map((a) => (
                <article key={a.id} className="md-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-extrabold leading-snug">{a.title}</h3>
                      <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
                        Hoàn thành {a.lastCompletedAt ? formatDateTime(a.lastCompletedAt) : "—"}
                      </p>
                    </div>
                    {a.studentStatus === "LATE" ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-[#fde8e8] px-2.5 py-1 text-xs font-extrabold text-[#ba1a1a]">
                        CHẬM HẠN
                      </span>
                    ) : (
                      <span className="md-chip">ĐÃ NỘP</span>
                    )}
                  </div>
                  <ProgressBar value={100} className="mt-4" />
                </article>
              ))}
            </div>
          ))}

        {tab === "materials" &&
          (materials.length === 0 ? (
            <Empty text="Chưa có tài liệu nào." />
          ) : (
            <ul className="grid gap-3">
              {materials.map((m) => (
                <li key={m.id} className="md-card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--md-surface-container)] text-[var(--md-primary)]">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">{m.title}</p>
                      <p className="truncate text-xs text-[var(--md-on-surface-variant)]">
                        {m.addedBy.name} · {formatDateTime(m.createdAt, false)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={m.mediaAsset.url}
                    target="_blank"
                    rel="noopener"
                    className="md-button tonal shrink-0"
                  >
                    <ExternalLink className="size-4" /> Mở tài liệu
                  </a>
                </li>
              ))}
            </ul>
          ))}

        {tab === "announcements" &&
          (announcements.length === 0 ? (
            <Empty text="Chưa có thông báo nào." />
          ) : (
            <div className="grid gap-4">
              {announcements.map((a) => (
                <article key={a.id} className="md-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 text-lg font-extrabold leading-snug">{a.title}</h3>
                    <span className="shrink-0 text-xs font-bold text-[var(--md-on-surface-variant)]">
                      {formatDateTime(a.createdAt, false)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--md-on-surface-variant)]">
                    {a.body}
                  </p>
                  <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-[var(--md-primary)]">
                    GV {a.author.name}
                  </p>
                </article>
              ))}
            </div>
          ))}

        {tab === "live" && (
          <div className="space-y-6">
            <section className="md-card p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--md-primary)]">HỎI NHANH TRỰC TIẾP</p>
              <h2 className="mt-1 text-xl font-extrabold">Trả lời câu hỏi của giáo viên</h2>
              <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
                Trang tự cập nhật — hãy trả lời trước khi giáo viên đóng câu hỏi.
              </p>
              <div className="mt-4">
                <LiveRoom classroomId={classroomId} role="student" />
              </div>
            </section>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--md-on-surface-variant)]">LỊCH BUỔI HỌC</p>
              {sessions.length === 0 ? (
                <Empty text="Chưa có lớp trực tiếp nào sắp diễn ra." />
              ) : (
                <div className="grid gap-4">
                  {sessions.map((s) => (
                    <article key={s.id} className="md-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="md-chip">SẮP DIỄN RA</span>
                          <h3 className="mt-2 text-lg font-extrabold leading-snug">{s.title}</h3>
                          <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
                            {formatDateTime(s.startsAt)} – {formatDateTime(s.endsAt)}
                          </p>
                        </div>
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--md-surface-container)] text-[var(--md-primary)]">
                          <Video className="size-5" />
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
