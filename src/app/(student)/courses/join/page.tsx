import { JoinClassForm } from "@/components/learning/JoinClassForm";
import { requireUser } from "@/lib/session";
export default async function JoinClassPage(){await requireUser();return <main className="mx-auto w-full max-w-2xl px-5 py-10"><p className="text-sm font-bold uppercase tracking-wider text-[var(--brand)]">Mã lớp</p><h1 className="mt-2 text-3xl font-extrabold">Học cùng giáo viên của bạn</h1><p className="mb-6 mt-2 text-[var(--muted)]">Sau khi tham gia, khóa học sẽ xuất hiện trong danh sách và lộ trình cá nhân.</p><JoinClassForm/></main>}
