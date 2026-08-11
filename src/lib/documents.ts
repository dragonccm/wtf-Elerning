export type DocSection = {
  heading?: string;
  body?: string;
  rows?: { hanzi: string; pinyin: string; meaning: string }[];
};

export type LessonDocument = {
  title: string;
  subtitle: string;
  sections: DocSection[];
};

const documents: Record<string, LessonDocument> = {
  "unit1-greetings": {
    title: "Unit 1 — Chào hỏi",
    subtitle: "Tài liệu bài học: Xin chào · Greetings",
    sections: [
      {
        heading: "Từ vựng cốt lõi",
        rows: [
          { hanzi: "你好", pinyin: "nǐ hǎo", meaning: "Xin chào" },
          { hanzi: "早上好", pinyin: "zǎo shang hǎo", meaning: "Chào buổi sáng" },
          { hanzi: "晚上好", pinyin: "wǎn shang hǎo", meaning: "Chào buổi tối" },
          { hanzi: "再见", pinyin: "zài jiàn", meaning: "Tạm biệt" },
          { hanzi: "谢谢", pinyin: "xiè xie", meaning: "Cảm ơn" },
          { hanzi: "不客气", pinyin: "bú kè qi", meaning: "Không có gì" },
        ],
      },
      {
        heading: "Mẫu câu",
        body: "A: 你好！\nB: 你好！\nA: 你好吗？\nB: 我很好，谢谢。",
      },
      {
        heading: "Ghi chú phát âm",
        body:
          "• 你 (nǐ) — thanh 3, nhẹ ở cuối.\n" +
          "• 好 (hǎo) — thanh 3, mở rộng âm cuối.\n" +
          "• Luyện đọc chậm trước, sau đó tăng tốc tự nhiên.",
      },
      {
        heading: "Bài tập",
        body: "1. Đọc to 5 từ vựng trên.\n2. Ghép đôi: 你好 ↔ Xin chào.\n3. Tự giới thiệu bằng 2 câu tiếng Trung.",
      },
    ],
  },
};

export function getDocument(slug: string): LessonDocument | null {
  return documents[slug] ?? null;
}

export function docHref(pdfUrl: string) {
  return pdfUrl.replace(/\.pdf$/i, "");
}
