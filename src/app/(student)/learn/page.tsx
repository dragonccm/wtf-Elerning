import Link from "next/link";
import { DailyBanner } from "@/components/learning/DailyBanner";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getDailySummary } from "@/lib/streak";
import { countDueCards } from "@/lib/drill";
import { ArrowRight, Bell, BookOpen, Clock3, Sparkles } from "lucide-react";

export default async function StudentDashboard() {
  const user = await requireUser();
  const [memberships, pendingEssays, reviewCount, daily, openClasses] = await Promise.all([
    prisma.classroomMember.findMany({ where: { userId: user.id, classroom: { course: { status: "PUBLISHED" } } }, include: { classroom: { include: { course: { include: { units: { include: { nodes: { include: { progress: { where: { userId: user.id, completed: true } } } } } } } } } } }, orderBy: { joinedAt: "desc" } }),
    prisma.submission.count({ where: { userId: user.id, autoGraded: false, status: "SUBMITTED" } }),
    countDueCards(user.id),
    getDailySummary(user.id),
    // open classes the student can still join (not yet a member, not ended)
    prisma.classroom.findMany({
      where: {
        status: { in: ["OPEN", "ACTIVE"] },
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
        course: { status: "PUBLISHED" },
        members: { none: { userId: user.id } },
      },
      include: { course: { select: { title: true, category: true, level: true } }, teacher: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const courses = memberships.map(({ classroom }) => {
    const nodes = classroom.course.units.flatMap(unit => unit.nodes);
    const done = nodes.filter(node => node.progress.length > 0).length;
    const next = nodes.find(node => node.progress.length === 0);
    return { classroom, total: nodes.length, done, next };
  });
  const primary = courses[0];

  return <main className="mx-auto max-w-3xl px-5 py-8 lg:px-8"><DailyBanner/><section className="relative overflow-hidden rounded-[28px] bg-[#173f35] p-6 text-white shadow-[0_14px_0_#0c2b24] md:p-8"><div className="absolute -right-12 -top-12 size-48 rounded-full bg-[var(--brand)]/25 blur-2xl"/><p className="text-sm font-extrabold uppercase tracking-[.18em] text-[#9cf56a]">Chào {user.name} · 你好</p><h1 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight md:text-4xl">Một bước nhỏ hôm nay, một câu tiếng Trung tự tin ngày mai.</h1>{primary?<Link href={`/learn/${primary.classroom.course.id}`} className="mt-7 inline-flex items-center gap-2 rounded-2xl border-2 border-b-4 border-[#58a700] bg-[var(--brand)] px-6 py-3 font-extrabold">Tiếp tục {primary.classroom.course.title}<ArrowRight className="size-5"/></Link>:<Link href="/courses/join" className="mt-7 inline-flex rounded-2xl bg-white px-6 py-3 font-extrabold text-[#173f35]">Nhập mã lớp</Link>}</section><section className="mt-8 grid gap-3 sm:grid-cols-3"><Stat icon={<Sparkles/>} label="XP hôm nay" value={`${daily?.dailyEarned??0}/${daily?.dailyTarget??20}`}/><Stat icon={<Clock3/>} label="Bài chờ chấm" value={String(pendingEssays)}/><Link href="/drills" className="rounded-[20px] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"><Stat icon={<BookOpen/>} label="Thẻ cần ôn" value={String(reviewCount)}/></Link></section><div className="mt-9 flex items-end justify-between"><div><p className="text-sm font-extrabold uppercase tracking-wider text-[var(--brand-dark)]">Lớp đang học</p><h2 className="mt-1 text-2xl font-extrabold">Lộ trình của bạn</h2></div><Link href="/notifications" className="flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><Bell className="size-4"/>Thông báo</Link></div><div className="mt-4 grid gap-4">{courses.map(({classroom,total,done})=>{const percent=total?Math.round(done/total*100):0;return <Link href={`/learn/${classroom.course.id}`} key={classroom.id} className="rounded-[24px] border-2 border-[var(--line)] bg-white p-5 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"><div className="flex items-start justify-between gap-3"><div><span className="rounded-lg bg-[var(--brand-soft)] px-2 py-1 text-xs font-extrabold text-[var(--brand-dark)]">{classroom.course.category} · {classroom.course.level}</span><h3 className="mt-3 text-xl font-extrabold">{classroom.course.title}</h3><p className="text-sm text-[var(--muted)]">{classroom.name} · {done}/{total} bài</p></div><strong className="text-2xl text-[var(--brand-dark)]">{percent}%</strong></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e5e5e5]"><div className="h-full rounded-full bg-[var(--brand)]" style={{width:`${percent}%`}}/></div></Link>})}{courses.length===0&&<div className="rounded-[24px] border-2 border-dashed border-[var(--line)] p-8 text-center"><p className="font-extrabold">Bạn chưa tham gia lớp nào</p><Link href="/courses/join" className="mt-3 inline-block font-bold text-[var(--brand-dark)]">Nhập mã lớp →</Link></div>}</div>{openClasses.length>0&&<section className="mt-9"><div><p className="text-sm font-extrabold uppercase tracking-wider text-[var(--brand-dark)]">Lớp đang mở</p><h2 className="mt-1 text-2xl font-extrabold">Các lớp sẵn sàng tham gia</h2><p className="mt-1 text-sm text-[var(--muted)]">Giáo viên đã mở lớp — bấm vào để nhập mã lớp + mật khẩu và tham gia ngay.</p></div><div className="mt-4 grid gap-4 sm:grid-cols-2">{openClasses.map((c)=><Link key={c.id} href={`/courses/join?code=${c.code}`} className="rounded-[24px] border-2 border-[var(--line)] bg-white p-5 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"><span className="rounded-lg bg-[var(--brand-soft)] px-2 py-1 text-xs font-extrabold text-[var(--brand-dark)]">{c.course.category} · {c.course.level}</span><h3 className="mt-3 text-lg font-extrabold">{c.name}</h3><p className="mt-1 text-sm text-[var(--muted)]">{c.course.title} · GV {c.teacher?.name ?? "—"}</p><p className="mt-3 text-sm font-extrabold text-[var(--brand-dark)]">Tham gia bằng mã lớp →</p></Link>)}</div></section>}</main>;
}

function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-[20px] border-2 border-[var(--line)] bg-white p-4"><div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-dark)]">{icon}</div><p className="mt-3 text-xs font-bold uppercase text-[var(--muted)]">{label}</p><p className="text-2xl font-extrabold">{value}</p></div>}
