import { DrillSession } from "@/components/learning/DrillSession";
import { getDistractorPool, getDueCards } from "@/lib/drill";
import { requireUser } from "@/lib/session";
import Link from "next/link";

export default async function DrillsPage() {
  const user = await requireUser();
  const [cards, distractorPool] = await Promise.all([
    getDueCards(user.id, 20),
    getDistractorPool(user.id),
  ]);

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex items-center gap-3 px-4 py-4">
        <Link href="/learn" className="text-sm font-bold text-[var(--muted)]">
          ← Trang học
        </Link>
      </div>
      <div className="flex-1 px-4 pb-10">
        <h1 className="text-2xl font-extrabold">Luyện nhanh</h1>
        <p className="mt-2 text-[var(--muted)]">
          Ôn các thẻ đến hạn theo lịch SRS — trả lời đúng thì thẻ “ngủ” đúng khoảng cách, sai thì gặp lại sau 10 phút.
        </p>
        {cards.length === 0 ? (
          <div className="mt-8 rounded-[24px] border-2 border-dashed border-[var(--line)] bg-white p-10 text-center">
            <h2 className="text-xl font-extrabold">Không có thẻ nào đến hạn</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Tuyệt! Học thêm trong lộ trình để mở khóa thẻ mới, hoặc quay lại khi lịch ôn đến.
            </p>
            <Link
              href="/learn"
              className="mt-5 inline-block rounded-2xl border-2 border-b-4 border-[#58a700] bg-[var(--brand)] px-6 py-3 font-extrabold text-white transition-all hover:brightness-105 active:translate-y-[2px] active:border-b-2"
            >
              Về trang học
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            <DrillSession cards={cards} distractorPool={distractorPool} />
          </div>
        )}
      </div>
    </main>
  );
}
