export type GradableQuestion = {
  id: string;
  type: string;
  answerJson: string;
  points: number;
};

export type StudentAnswer = {
  questionId: string;
  responseJson: string;
};

function normalize(value: unknown): unknown {
  if (typeof value === "string") return value.trim().toLowerCase();
  if (Array.isArray(value)) return value.map((v) => String(v).trim().toLowerCase()).sort();
  return value;
}

export function gradeAnswers(questions: GradableQuestion[], answers: StudentAnswer[]) {
  let score = 0;
  let maxScore = 0;
  const details = questions.map((q) => {
    maxScore += q.points;
    if (q.type.startsWith("ESSAY")) {
      return { questionId: q.id, isCorrect: null as boolean | null, pointsEarned: 0 };
    }
    const student = answers.find((a) => a.questionId === q.id);
    if (!student) {
      return { questionId: q.id, isCorrect: false, pointsEarned: 0 };
    }
    let expected: unknown;
    let actual: unknown;
    try {
      expected = JSON.parse(q.answerJson);
      actual = JSON.parse(student.responseJson);
    } catch {
      return { questionId: q.id, isCorrect: false, pointsEarned: 0 };
    }
    const correct = JSON.stringify(normalize(expected)) === JSON.stringify(normalize(actual));
    const pointsEarned = correct ? q.points : 0;
    score += pointsEarned;
    return { questionId: q.id, isCorrect: correct, pointsEarned };
  });

  return { score, maxScore, details, percent: maxScore ? (score / maxScore) * 100 : 0 };
}
