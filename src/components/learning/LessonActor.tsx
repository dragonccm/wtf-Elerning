import Image from "next/image";

type LessonActorProps = {
  message: string;
  className?: string;
};

export function LessonActor({ message, className = "" }: LessonActorProps) {
  return (
    <aside className={`lesson-actor ${className}`} aria-label={`Mây, trợ giảng: ${message}`}>
      <div className="lesson-actor__bubble">
        <span className="lesson-actor__name">Mây nhắc nhỏ</span>
        <p>{message}</p>
      </div>
      <Image
        className="lesson-actor__image"
        src="/actors/may-wave-v2.png"
        alt="Mây, trợ giảng gấu trúc đỏ đang vẫy tay"
        width={1254}
        height={1254}
        sizes="(max-width: 640px) 108px, 148px"
        priority
      />
    </aside>
  );
}
