import { getDocument } from "@/lib/documents";
import { PrintButton } from "@/components/docs/PrintButton";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function DocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDocument(slug);
  if (!doc) notFound();

  return (
    <main className="min-h-screen bg-[#f7f7f7] print:bg-white">
      <div className="mx-auto max-w-3xl px-5 py-8 print:max-w-none print:px-8 print:py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/learn" className="text-sm font-bold text-[var(--muted)] hover:text-[#3c3c3c]">
            ← Quay lại lộ trình
          </Link>
          <PrintButton />
        </div>

        <article className="rounded-2xl border-2 border-[var(--line)] bg-white p-8 shadow-sm print:border-0 print:shadow-none">
          <header className="border-b border-[var(--line)] pb-6">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--brand-dark)]">WTF Learn</p>
            <h1 className="mt-2 font-[family-name:var(--font-hanzi)] text-3xl font-extrabold text-[#3c3c3c]">
              {doc.title}
            </h1>
            <p className="mt-2 text-[var(--muted)]">{doc.subtitle}</p>
          </header>

          <div className="mt-8 space-y-8">
            {doc.sections.map((section) => (
              <section key={section.heading ?? section.body}>
                {section.heading && (
                  <h2 className="text-lg font-extrabold text-[#3c3c3c]">{section.heading}</h2>
                )}
                {section.rows && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--surface)] text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                        <tr>
                          <th className="px-4 py-3">Chữ Hán</th>
                          <th className="px-4 py-3">Phiên âm</th>
                          <th className="px-4 py-3">Nghĩa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row) => (
                          <tr key={row.hanzi} className="border-t border-[var(--line)]">
                            <td className="px-4 py-3 font-[family-name:var(--font-hanzi)] text-lg font-bold">
                              {row.hanzi}
                            </td>
                            <td className="px-4 py-3 text-[var(--muted)]">{row.pinyin}</td>
                            <td className="px-4 py-3 font-semibold">{row.meaning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {section.body && (
                  <pre className="mt-3 whitespace-pre-wrap font-[family-name:var(--font-hanzi)] text-base leading-relaxed text-[#3c3c3c]">
                    {section.body}
                  </pre>
                )}
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
