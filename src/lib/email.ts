export type EmailResult = { status: "SENT" | "SKIPPED_DEV" | "FAILED"; error?: string };

export async function sendClassInvitationEmail(input: {
  to: string;
  teacherName: string;
  classroomName: string;
  code: string;
  password: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[email:dev] Class invitation for ${input.to}: ${input.code}`);
    return { status: "SKIPPED_DEV" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "WTF E-learning <onboarding@resend.dev>",
        to: [input.to],
        subject: `Lời mời tham gia lớp ${input.classroomName}`,
        html: `<h2>${input.teacherName} mời bạn tham gia ${input.classroomName}</h2><p>Mã lớp: <strong>${input.code}</strong></p><p>Mật khẩu: <strong>${input.password}</strong></p><p>Đăng nhập WTF E-learning và chọn “Tham gia lớp”.</p>`,
      }),
    });
    if (!response.ok) return { status: "FAILED", error: `Resend ${response.status}` };
    return { status: "SENT" };
  } catch (error) {
    return { status: "FAILED", error: error instanceof Error ? error.message : "Email failed" };
  }
}
