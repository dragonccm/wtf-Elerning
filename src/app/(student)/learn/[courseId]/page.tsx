import { LearningPath } from "@/components/learning/LearningPath";
import { UnitHeader } from "@/components/learning/UnitHeader";
import { activityHref, getNodeStates } from "@/lib/progress";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function CourseLearnPage({params}:{params:Promise<{courseId:string}>}){
  const user=await requireUser(); const {courseId}=await params;
  const membership=await prisma.classroomMember.findFirst({where:{userId:user.id,classroom:{courseId,course:{status:"PUBLISHED"}}},include:{classroom:{include:{course:{include:{units:{where:{status:"PUBLISHED"},orderBy:{orderIndex:"asc"}}}}}}}});
  if(!membership)notFound(); const course=membership.classroom.course;
  const sections=[]; let previousComplete=true;
  for(const unit of course.units){const nodes=await getNodeStates(user.id,unit.id);const unlocked=previousComplete;sections.push({unit,nodes,unlocked});previousComplete=nodes.length>0&&nodes.every(n=>n.state==="completed");}
  return <main className="min-h-screen">{sections.map(({unit,nodes,unlocked},i)=><section key={unit.id} className={!unlocked?"pointer-events-none opacity-50":""}><UnitHeader sectionLabel={`${course.level} · Unit ${i+1}`} title={unit.title} objective={unit.objective}/><LearningPath nodes={nodes.map(n=>({id:n.id,title:n.title,type:n.type,state:unlocked?n.state:"locked",href:unlocked&&n.state!=="locked"?activityHref(n.type,n.id):undefined}))}/></section>)}</main>;
}
