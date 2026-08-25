"use client";

import {
  addClassMemberAction,
  closeClassroomAction,
  createClassroomAction,
  inviteStudentAction,
  rotateClassroomPasswordAction,
  setClassroomPasswordAction,
  type ActionState,
} from "@/lib/classroom-actions";
import { QRCodeSVG } from "qrcode.react";
import { useActionState, useState } from "react";
import { cn } from "@/lib/utils";

const initial: ActionState = {};

export function CreateClassroomForm({
  courses,
  defaultCourseId,
}: {
  courses: { id: string; title: string }[];
  defaultCourseId?: string;
}) {
  const [state, action, pending] = useActionState(createClassroomAction, initial);
  return (
    <form action={action} className="md-card grid gap-4 p-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--md-primary)]">Lớp mới</p>
        <h2 className="mt-1 text-xl font-extrabold">Mở lớp từ khóa đã xuất bản</h2>
        <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
          Khóa học = nội dung bài học (có thể do bạn hoặc Admin tạo). Lớp học = nhóm học viên cùng học một khóa.
          Chọn bất kỳ khóa nào đã xuất bản bên dưới.
        </p>
      </div>
      <select name="courseId" required defaultValue={defaultCourseId ?? ""} className="md-field">
        <option value="">Chọn khóa học</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <input name="name" required minLength={3} placeholder="Tên lớp (VD: HSK1 · Lớp tối T2-T4)" className="md-field" />
      <label className="text-sm font-bold">
        Ngày bắt đầu
        <input name="startsAt" type="datetime-local" required className="md-field mt-1" />
      </label>
      <label className="text-sm font-bold">
        Ngày kết thúc
        <input name="endsAt" type="datetime-local" required className="md-field mt-1" />
      </label>
      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <button disabled={pending} className="md-button">{pending ? "Đang tạo…" : "Tạo lớp & sinh mật khẩu"}</button>
        <p aria-live="polite" className="text-sm text-[var(--md-on-surface-variant)]">{state.message}</p>
      </div>
      {state.ok && (
        <div className="md:col-span-2 rounded-2xl bg-[var(--md-primary-container)] p-4 text-[var(--md-on-primary-container)]">
          <p className="text-xs font-bold uppercase">Chỉ hiển thị lần này</p>
          <p className="mt-2 font-mono text-lg">
            <strong>{state.code}</strong> · {state.password}
          </p>
          <p className="mt-2 text-sm">
            Mở trang quản lý lớp để copy link tham gia / mã QR, và đổi mật khẩu thành mã dễ nhớ nếu muốn.
          </p>
        </div>
      )}
    </form>
  );
}

export function InviteStudentForm({ classroomId }: { classroomId: string }) {
  const [state, action, pending] = useActionState(inviteStudentAction, initial);
  return (
    <form action={action} className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
      <input type="hidden" name="classroomId" value={classroomId} />
      <input name="email" type="email" required placeholder="Email học viên" className="md-field" />
      <input name="password" type="password" required placeholder="Mật khẩu lớp" className="md-field" />
      <button disabled={pending} className="md-button tonal">Mời qua email</button>
      {state.message && <p aria-live="polite" className="text-sm md:col-span-3">{state.message}</p>}
    </form>
  );
}

export function SetClassPasswordForm({ classroomId, ended }: { classroomId: string; ended: boolean }) {
  const [state, action, pending] = useActionState(setClassroomPasswordAction, initial);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="classroomId" value={classroomId} />
      <input
        name="newPassword"
        required
        minLength={6}
        maxLength={40}
        placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
        disabled={ended}
        className="md-field"
      />
      <button disabled={pending || ended} className="md-button tonal">{pending ? "Đang đặt…" : "Đặt mật khẩu"}</button>
      {state.message && (
        <p aria-live="polite" className={cn("sm:col-span-2 text-sm font-bold", state.ok ? "text-[var(--md-primary)]" : "text-[var(--md-error)]")}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export function AddMemberForm({
  classroomId,
  candidates,
}: {
  classroomId: string;
  candidates: { id: string; name: string; email: string }[];
}) {
  const [state, action, pending] = useActionState(addClassMemberAction, initial);
  return (
    <form action={action} className="mt-4 grid gap-2 border-t border-[var(--md-outline-variant)] pt-4 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="classroomId" value={classroomId} />
      <select name="userId" required defaultValue="" className="md-field">
        <option value="">Chọn học viên đã đăng ký trong hệ thống…</option>
        {candidates.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} — {s.email}
          </option>
        ))}
      </select>
      <button disabled={pending || candidates.length === 0} className="md-button tonal">
        {pending ? "Đang thêm…" : "Thêm vào lớp"}
      </button>
      {state.message && (
        <p aria-live="polite" className={cn("sm:col-span-2 text-sm font-bold", state.ok ? "text-[var(--md-primary)]" : "text-[var(--md-error)]")}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export function ShareClassCard({ name, code, shareUrl, ended }: { name: string; code: string; shareUrl: string; ended: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className="md-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--md-primary)]">CHIA SẺ LỚP</p>
          <h2 className="mt-1 text-xl font-extrabold">Gửi link tham gia cho học viên</h2>
        </div>
        <span className="text-sm font-bold text-[var(--md-on-surface-variant)]">{name}</span>
      </div>
      <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
        Học viên bấm link hoặc quét mã QR, nhập mã lớp + mật khẩu là vào được. Đổi mật khẩu bên dưới nếu muốn mã dễ nhớ.
      </p>
      <div className="mt-4 flex flex-wrap items-start gap-5">
        <div className="grid size-44 shrink-0 place-items-center rounded-2xl border-2 border-[var(--md-outline-variant)] bg-white p-3">
          <QRCodeSVG value={shareUrl} size={140} marginSize={0} />
        </div>
        <div className="min-w-[260px] flex-1 space-y-3">
          <div className="rounded-2xl bg-[var(--md-surface-container)] p-4">
            <p className="text-xs font-bold uppercase">Mã lớp</p>
            <p className="mt-1 font-mono text-2xl font-extrabold">{code}</p>
          </div>
          <div className="rounded-2xl bg-[var(--md-surface-container)] p-4">
            <p className="text-xs font-bold uppercase">Link tham gia</p>
            <p className="mt-1 break-all font-mono text-sm">{shareUrl}</p>
            <button type="button" onClick={copy} disabled={ended} className="md-button tonal mt-3">
              {copied ? "Đã copy ✓" : "Copy link"}
            </button>
          </div>
          <p className="text-xs text-[var(--md-on-surface-variant)]">
            Lưu ý: mật khẩu lớp không hiển thị ở đây (chỉ lưu dạng băm). Đặt mật khẩu mới bên dưới và tự chia sẻ cho học viên.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ClassroomSecurityActions({ classroomId, ended }: { classroomId: string; ended: boolean }) {
  const [state, rotate, pending] = useActionState(rotateClassroomPasswordAction, initial);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <form action={rotate}>
        <input type="hidden" name="classroomId" value={classroomId} />
        <button disabled={pending || ended} className="md-button outlined">Sinh mật khẩu ngẫu nhiên</button>
      </form>
      {!ended && (
        <form action={closeClassroomAction}>
          <input type="hidden" name="classroomId" value={classroomId} />
          <button className="md-button outlined">Kết thúc lớp</button>
        </form>
      )}
      {state.message && (
        <p className="w-full text-sm">
          {state.message}
          {state.password && <strong className="ml-2 font-mono">{state.code} · {state.password}</strong>}
        </p>
      )}
    </div>
  );
}
