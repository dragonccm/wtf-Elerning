"use client";

import { PathNode, PathNodeKind, PathNodeState } from "./PathNode";

export type PathItem = {
  id: string;
  title: string;
  type: PathNodeKind;
  state: PathNodeState;
  href?: string;
};

const offsets = [0, -56, -88, -56, 0, 56, 88, 56];

export function LearningPath({ nodes }: { nodes: PathItem[] }) {
  return (
    <div className="relative mx-auto flex w-full max-w-[520px] flex-col items-center gap-10 px-4 py-10">
      <div className="pointer-events-none absolute right-6 top-40 hidden select-none text-7xl opacity-90 sm:block">
        🐉
      </div>
      {nodes.map((node, i) => (
        <div key={node.id} className="relative w-full">
          {i === 3 && (
            <div className="mb-8 flex items-center gap-3 px-8">
              <div className="h-0.5 flex-1 bg-[#e5e5e5]" />
              <span className="text-sm font-extrabold text-[#afafaf]">Tiếp theo trong chuỗi</span>
              <div className="h-0.5 flex-1 bg-[#e5e5e5]" />
            </div>
          )}
          <PathNode
            index={i}
            kind={node.type}
            state={node.state}
            href={node.href}
            label={node.state === "current" ? "Bắt đầu" : undefined}
            offset={offsets[i % offsets.length]}
          />
        </div>
      ))}
    </div>
  );
}
