import type { CountAggregate, Lesson, LessonProgress, SubjectWithLessons } from "@/types/lms";

export function relationCount(value: CountAggregate[] | CountAggregate | unknown[] | null | undefined) {
  if (!value) return 0;
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === "object" && "count" in first) {
      const count = (first as CountAggregate).count;
      return count ?? 0;
    }
    return value.length;
  }
  return value.count ?? 0;
}

export function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

export function sortByOrder<T extends { order_index: number }>(items: T[] | null | undefined) {
  return [...(items ?? [])].sort((a, b) => a.order_index - b.order_index);
}

export function flattenLessons(subjects: SubjectWithLessons[] | null | undefined, fallback: Lesson[] = []) {
  const subjectLessons = (subjects ?? []).flatMap((subject) =>
    sortByOrder(subject.lessons).map((lesson) => ({
      ...lesson,
      subjectTitle: subject.title,
      subjectLocked: subject.is_locked,
    })),
  );

  return subjectLessons.length
    ? subjectLessons
    : sortByOrder(fallback).map((lesson) => ({
        ...lesson,
        subjectTitle: null,
        subjectLocked: false,
      }));
}

export function courseProgress(lessons: Lesson[], progress: LessonProgress[] | null | undefined) {
  const completedIds = new Set((progress ?? []).filter((item) => item.completed_at).map((item) => item.lesson_id));
  return {
    completed: lessons.filter((lesson) => completedIds.has(lesson.id)).length,
    total: lessons.length,
    percent: percentage(completedIds.size, lessons.length),
  };
}

export function certificateCode(courseId: string, userId: string) {
  return `MED-${courseId.slice(0, 4).toUpperCase()}-${userId.slice(0, 4).toUpperCase()}-${Date.now()
    .toString(36)
    .toUpperCase()}`;
}
