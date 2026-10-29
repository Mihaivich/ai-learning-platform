import { notFound } from "next/navigation";
import { Desktop } from "@/components/projects/desktop/Desktop";
import { getProjectScenario } from "@/lib/projects";
import { readLesson } from "@/lib/learning/repository";
import { validateActivity } from "@/lib/learning/registry";
import type { ProjectCourseContext } from "@/lib/learning/project-links";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { scenarioId } = await params;
  const scenario = getProjectScenario(scenarioId);
  if (!scenario) notFound();
  const query = await searchParams;
  let courseContext: ProjectCourseContext | undefined;
  if (query.courseId || query.lessonId || query.activityId) {
    if (typeof query.courseId !== "string" || typeof query.lessonId !== "string" || typeof query.activityId !== "string") notFound();
    const found = await readLesson(query.courseId, query.lessonId);
    const activity = validateActivity(found?.lesson.blocks.find((item) => item.id === query.activityId));
    if (!activity.success || activity.data.activityType !== "project" || activity.data.config.scenarioId !== scenario.id) notFound();
    courseContext = { courseId: query.courseId, lessonId: query.lessonId, activityId: query.activityId };
  }
  // Only public framing is passed down. The run itself comes from the API.
  return (
    <Desktop
      scenarioId={scenario.id}
      title={scenario.title}
      summary={scenario.summary}
      client={scenario.client}
      courseContext={courseContext}
    />
  );
}
