"use client";

import { closeClassroomAction, createClassroomAction, inviteStudentAction, rotateClassroomPasswordAction, type ActionState } from "@/lib/classroom-actions";
import { useActionState } from "react";

const initial: ActionState = {};

export function CreateClassroomForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(createClassroomAction, initial);
  return (
    <form action={action} className="md-card grid gap-4 p-5 md:grid-cols-2">
      <div className="md:col-span-2"><p className="text-xs font-bold uppercase tracking-wider text-[var(--md-primary)]">Lớp mới</p><h2 className="mt-1 text-xl font-extrabold">Mở lớp từ khóa đã xuất bản</h2></div>
      <select name="courseId" required className="md-field"><option value="">Chọn khóa học</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
      <input name="name" required minLength={3} placeholder="Tên lớp" className="md-field" />
      <label className="text-sm font-bold">Ngày bắt đầu<input name="startsAt" type="datetime-local" required className="md-field mt-1" /></label>
      <label className="text-sm font-bold">Ngày kết thúc<input name="endsAt" type="datetime-local" required className="md-field mt-1" /></label>
      <div className="md:col-span-2 flex flex-wrap items-center gap-3"><button disabled={pending} className="md-button">{pending ? "Đang tạo…" : "Tạo lớp & sinh mật khẩu"}</button><p aria-live="polite" className="text-sm text-[var(--md-on-surface-variant)]">{state.message}</p></div>
      {state.ok && <div className="md:col-span-2 rounded-2xl bg-[var(--md-primary-container)] p-4 text-[var(--md-on-primary-container)]"><p className="text-xs font-bold uppercase">Chỉ hiển thị lần này</p><p className="mt-2 font-mono text-lg"><strong>{state.code}</strong> · {state.password}</p></div>}
    </form>
  );
}

export function InviteStudentForm({ classroomId }: { classroomId: string }) {
  const [state, action, pending] = useActionState(inviteStudentAction, initial);
  return <form action={action} className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]"><input type="hidden" name="classroomId" value={classroomId}/><input name="email" type="email" required placeholder="Email học viên" className="md-field"/><input name="password" type="password" required placeholder="Mật khẩu lớp" className="md-field"/><button disabled={pending} className="md-button tonal">Mời học viên</button>{state.message && <p aria-live="polite" className="text-sm md:col-span-3">{state.message}</p>}</form>;
}

export function ClassroomSecurityActions({classroomId,ended}:{classroomId:string;ended:boolean}){
  const[state,rotate,pending]=useActionState(rotateClassroomPasswordAction,initial);
  return <div className="mt-4 flex flex-wrap items-center gap-2"><form action={rotate}><input type="hidden" name="classroomId" value={classroomId}/><button disabled={pending||ended} className="md-button outlined">Đổi mật khẩu</button></form>{!ended&&<form action={closeClassroomAction}><input type="hidden" name="classroomId" value={classroomId}/><button className="md-button outlined">Kết thúc lớp</button></form>}{state.message&&<p className="w-full text-sm">{state.message}{state.password&&<strong className="ml-2 font-mono">{state.password}</strong>}</p>}</div>
}
