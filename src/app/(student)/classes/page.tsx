import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { cn, deadlineLabel, formatDateTime } from "@/lib/utils";
import { ArrowRight, Bell, CalendarClock, Video } from "lucide-react";

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

export default async function StudentClassesPage() {
  const user = await requireUser();
  const classrooms = await prisma.classroom.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { course: true, teacher: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const ids = classrooms.map((c) => c.id);
  const [assignments, announcements, sessions] = await Promise.all([
    prisma.assignment.findMany({
      where: { classroomId: { in: ids }, status: { not: "ARCHIVED" } },
      select: { classroomId: true, title: true, dueAt: true },
      orderBy: { dueAt: "asc" },
    }),
    prisma.announcement.findMany({
      where: { classroomId: { in: ids } },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.classSession.findMany({
      where: { classroomId: { in: ids }, status: "SCHEDULED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const nextAssignment = new Map<string, (typeof assignments)[number]>();
  for (const a of assignments) if (!nextAssignment.has(a.classroomId)) nextAssignment.set(a.classroomId, a);
  const latestAnnouncement = new Map<string, (typeof announcements)[number]>();
  for (const a of announcements) if (!latestAnnouncement.has(a.classroomId)) latestAnnouncement.set(a.classroomId, a);
  const upcomingSessions = new Map<string, (typeof sessions)[number][]>();
  for (const s of sessions) {
    const list = upcomingSessions.get(s.classroomId) ?? [];
    list.push(s);
    upcomingSessions.set(s.classroomId, list);
  }

  return (
    <main className="staff-theme mx-auto w-full max-w-3xl px-5 py-8 lg:px-8">
      <header>
        <p className="text-sm font-bold text-[var(--md-primary)]">LỚP CỦA TÔI</p>
        <h1 className="mt-1 text-3xl font-extrabold">Lớp của tôi</h1>
        <p className="mt-2 text-[var(--md-on-surface-variant)]">
          Bài tập, thông báo và lịch lớp học trực tiếp của bạn.
        </p>
      </header>

      {classrooms.length === 0 ? (
        <div className="mt-7 md-card p-10 text-center text-[var(--md-on-surface-variant)]">
          <p className="font-semibold">Chưa có lớp nào — hãy tham gia lớp bằng mã lớp.</p>
          <Link
            href="/courses/join"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--md-primary)] px-5 py-2.5 text-sm font-extrabold text-[var(--md-on-primary)] transition hover:brightness-105"
          >
            Nhập mã lớp <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <section className="mt-7 grid gap-4 lg:grid-cols-2">
          {classrooms.map((c) => {
            const next = nextAssignment.get(c.id);
            const announcement = latestAnnouncement.get(c.id);
            const live = upcomingSessions.get(c.id) ?? [];
            return (
              <Link
                key={c.id}
                href={`/classes/${c.id}`}
                className="md-card group block p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="md-chip">{c.status}</span>
                    <h2 className="mt-2 text-xl font-extrabold leading-snug">{c.name}</h2>
                    <p className="mt-1 truncate text-sm text-[var(--md-on-surface-variant)]">
                      {c.course.title} · GV {c.teacher?.name ?? "Chưa gán"}
                    </p>
                  </div>
                  <ArrowRight className="mt-1.5 size-5 shrink-0 text-[var(--md-primary)] transition group-hover:translate-x-1" />
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-[var(--md-on-surface-variant)]">
                    <CalendarClock className="size-4 shrink-0 text-[var(--md-primary)]" />
                    {next ? (
                      <>
                        <span className="min-w-0 truncate font-semibold">
                          Bài: {next.title} · {formatDateTime(next.dueAt, false)}
                        </span>
                        <DeadlineChip dueAt={next.dueAt} />
                      </>
                    ) : (
                      <span className="font-semibold">Chưa có bài tập nào.</span>
                    )}
                  </p>
                  <p className="flex items-center gap-2 text-[var(--md-on-surface-variant)]">
                    <Bell className="size-4 shrink-0 text-[var(--md-primary)]" />
                    {announcement ? (
                      <span className="min-w-0 truncate font-semibold">
                        {announcement.title} — {announcement.author.name}
                      </span>
                    ) : (
                      <span className="font-semibold">Chưa có thông báo.</span>
                    )}
                  </p>
                  <p className="flex items-center gap-2 text-[var(--md-on-surface-variant)]">
                    <Video className="size-4 shrink-0 text-[var(--md-primary)]" />
                    {live.length > 0 ? (
                      <span className="min-w-0 truncate font-semibold">
                        {live.length} lớp trực tiếp · gần nhất {formatDateTime(live[0].startsAt, false)}
                      </span>
                    ) : (
                      <span className="font-semibold">Chưa có lớp trực tiếp sắp tới.</span>
                    )}
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
