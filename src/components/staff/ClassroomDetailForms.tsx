"use client";

import { attachMaterialAction, createAssignmentAction, postAnnouncementAction, scheduleSessionAction, type ActionState } from "@/lib/assignment-actions";
import { useActionState } from "react";

const initial: ActionState = {};

const NODE_TYPE_LABELS: Record<string, string> = {
  VIDEO: "Video",
  FLASHCARD: "Flashcard",
  QUIZ: "Quiz",
  ESSAY: "Tự luận",
  MILESTONE: "Cột mốc",
};

export function PostAnnouncementForm({ classroomId }: { classroomId: string }) {
  const [state, action, pending] = useActionState(postAnnouncementAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="classroomId" value={classroomId} />
      <input name="title" required minLength={3} maxLength={200} placeholder="Tiêu đề thông báo" className="md-field" />
      <textarea name="body" required rows={3} maxLength={4000} placeholder="Nội dung thông báo" className="md-field resize-y" />
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="md-button">{pending ? "Đang đăng…" : "Đăng thông báo"}</button>
        <p aria-live="polite" className="text-sm text-[var(--md-on-surface-variant)]">{state.message}</p>
      </div>
    </form>
  );
}

export function CreateAssignmentForm({
  classroomId,
  units,
}: {
  classroomId: string;
  units: { id: string; title: string; nodes: { id: string; title: string; type: string }[] }[];
}) {
  const [state, action, pending] = useActionState(createAssignmentAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="classroomId" value={classroomId} />
      <input name="title" required minLength={3} maxLength={200} placeholder="Tên bài tập" className="md-field" />
      <textarea name="description" rows={2} maxLength={4000} placeholder="Mô tả (tùy chọn)" className="md-field resize-y" />
      <label className="text-sm font-bold">
        Hạn chót
        <input name="dueAt" type="datetime-local" required className="md-field mt-1" />
      </label>
      <fieldset className="rounded-2xl bg-[var(--md-surface-container)] p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wider text-[var(--md-primary)]">
          Chọn bài học (chọn được nhiều)
        </legend>
        {units.map((unit) => (
          <div key={unit.id} className="mt-3 first:mt-0">
            <p className="text-sm font-extrabold">{unit.title}</p>
            <div className="mt-1 grid gap-1">
              {unit.nodes.map((node) => (
                <label key={node.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/70">
                  <input type="checkbox" name="nodeId" value={node.id} className="size-4 shrink-0" />
                  <span>{node.title} — {NODE_TYPE_LABELS[node.type] ?? node.type}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="md-button">{pending ? "Đang giao…" : "Giao bài tập"}</button>
        <p aria-live="polite" className="text-sm text-[var(--md-on-surface-variant)]">{state.message}</p>
      </div>
    </form>
  );
}

export function ScheduleSessionForm({ classroomId }: { classroomId: string }) {
  const [state, action, pending] = useActionState(scheduleSessionAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="classroomId" value={classroomId} />
      <input name="title" required minLength={3} maxLength={200} placeholder="Tên buổi học trực tiếp" className="md-field" />
      <label className="text-sm font-bold">
        Bắt đầu
        <input name="startsAt" type="datetime-local" required className="md-field mt-1" />
      </label>
      <label className="text-sm font-bold">
        Kết thúc
        <input name="endsAt" type="datetime-local" required className="md-field mt-1" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="md-button">{pending ? "Đang lên lịch…" : "Lên lịch lớp trực tiếp"}</button>
        <p aria-live="polite" className="text-sm text-[var(--md-on-surface-variant)]">{state.message}</p>
      </div>
    </form>
  );
}

export function AttachMaterialForm({
  classroomId,
  assets,
}: {
  classroomId: string;
  assets: { id: string; originalName: string }[];
}) {
  const [state, action, pending] = useActionState(attachMaterialAction, initial);
  if (assets.length === 0) {
    return (
      <p className="rounded-2xl bg-[var(--md-surface-container)] p-4 text-sm text-[var(--md-on-surface-variant)]">
        Chưa có tệp nào trong thư viện của bạn.
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="classroomId" value={classroomId} />
      <select name="mediaAssetId" required className="md-field">
        <option value="">Chọn tệp đã tải lên</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>{a.originalName}</option>
        ))}
      </select>
      <input name="title" required minLength={1} maxLength={200} placeholder="Tên tài liệu" className="md-field" />
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="md-button">{pending ? "Đang thêm…" : "Thêm tài liệu"}</button>
        <p aria-live="polite" className="text-sm text-[var(--md-on-surface-variant)]">{state.message}</p>
      </div>
    </form>
  );
}
