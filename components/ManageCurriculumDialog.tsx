'use client';

import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { 
  getCourseData, 
  addSubjectAction, 
  removeSubjectAction, 
  updateSubjectAction,
  addLessonAction, 
  removeLessonAction,
  updateLessonAction
} from '@/app/admin/courses/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, FolderPlus, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react';

function SubmitButton({ label, pendingLabel }: { label: string, pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function ManageCurriculumDialog({ courseId, courseTitle }: { courseId: string, courseTitle: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track which subjects are expanded
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  
  // Track which items are being edited
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  useEffect(() => {
    if (isOpen && !course) {
      setIsLoading(true);
      getCourseData(courseId).then(data => {
        setCourse(data);
        setIsLoading(false);
      });
    }
  }, [isOpen, courseId, course]);

  const toggleSubject = (subjectId: string) => {
     setExpandedSubjects(prev => ({
        ...prev,
        [subjectId]: !prev[subjectId]
     }));
  };

  // === SUBJECT OPERATIONS ===
  const handleAddSubject = async (formData: FormData) => {
     await addSubjectAction(courseId, formData);
     const newData = await getCourseData(courseId);
     setCourse(newData);
     (document.getElementById('form-add-subject') as HTMLFormElement)?.reset();
  };
  const handleUpdateSubject = async (formData: FormData) => {
     await updateSubjectAction(courseId, formData);
     const newData = await getCourseData(courseId);
     setCourse(newData);
     setEditingSubject(null);
  };
  const handleRemoveSubject = async (formData: FormData) => {
     await removeSubjectAction(courseId, formData);
     const newData = await getCourseData(courseId);
     setCourse(newData);
  };

  // === LESSON OPERATIONS ===
  const handleAddLesson = async (formData: FormData) => {
     await addLessonAction(courseId, formData);
     const newData = await getCourseData(courseId);
     setCourse(newData);
     (document.getElementById(`form-add-lesson-${formData.get('subject_id')}`) as HTMLFormElement)?.reset();
  };
  const handleUpdateLesson = async (formData: FormData) => {
     await updateLessonAction(courseId, formData);
     const newData = await getCourseData(courseId);
     setCourse(newData);
     setEditingLesson(null);
  };
  const handleRemoveLesson = async (formData: FormData) => {
     await removeLessonAction(courseId, formData);
     const newData = await getCourseData(courseId);
     setCourse(newData);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <FolderPlus className="mr-2" size={14} />
        Curriculum
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0 bg-background rounded-t-xl z-10">
               <div>
                  <h2 className="text-xl font-bold tracking-tight text-primary">Manage Curriculum</h2>
                  <p className="text-muted-foreground text-sm font-medium">Course: {courseTitle}</p>
               </div>
               <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                 <X size={20} />
               </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {isLoading ? (
                 <div className="text-center py-12 text-muted-foreground">Loading curriculum data...</div>
              ) : (
                 <>
                   {/* Add Subject Row */}
                   <Card className="p-4 bg-secondary/20 border-primary/20 border">
                      <form id="form-add-subject" action={handleAddSubject} className="flex gap-2 items-center">
                         <div className="flex-1">
                           <Input type="text" name="title" required placeholder="Create New Subject Block..." className="h-9 shadow-sm" />
                         </div>
                         <SubmitButton label="+ Block" pendingLabel="Adding..." />
                      </form>
                   </Card>

                   {/* Subjects List */}
                   <div className="space-y-4">
                      {course?.subjects?.sort((a: any, b: any) => a.order_index - b.order_index).map((subject: any, subjectIndex: number) => {
                         const isExpanded = expandedSubjects[subject.id];
                         const isEditingThisSubject = editingSubject?.id === subject.id;

                         return (
                         <Card key={subject.id} className={`shadow-sm overflow-hidden border-2 ${isExpanded ? 'border-primary/20' : 'border-border/50'}`}>
                            {/* Accordion Header */}
                            <div 
                               onClick={() => !isEditingThisSubject && toggleSubject(subject.id)}
                               className={`flex items-center justify-between p-4 transition-colors ${!isEditingThisSubject && 'cursor-pointer hover:bg-secondary/10'}`}
                            >
                               
                               {isEditingThisSubject ? (
                                  <form action={handleUpdateSubject} className="flex-1 flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                                     <input type="hidden" name="subjectId" value={subject.id} />
                                     <Input type="text" name="title" defaultValue={subject.title} autoFocus required className="h-8 max-w-sm" />
                                     <Button type="submit" size="sm">Save</Button>
                                     <Button type="button" variant="ghost" size="sm" onClick={() => setEditingSubject(null)}>Cancel</Button>
                                  </form>
                               ) : (
                                  <>
                                     <h3 className="font-bold text-base flex items-center gap-3 select-none">
                                        <span className={`w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold shrink-0 ${isExpanded ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                                           {subjectIndex + 1}
                                        </span>
                                        {subject.title}
                                        <span className="text-xs font-normal text-muted-foreground ml-2 px-2 py-0.5 bg-secondary rounded-full">
                                          {subject.lessons?.length || 0} Lessons
                                        </span>
                                     </h3>
                                     <div className="flex items-center gap-0">
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="icon" 
                                          title="Edit Title"
                                          className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                                          onClick={(e) => { e.stopPropagation(); setEditingSubject(subject); }}
                                        >
                                           <Edit2 size={16} />
                                        </Button>

                                        <form action={handleRemoveSubject} onClick={(e) => e.stopPropagation()}>
                                           <input type="hidden" name="subjectId" value={subject.id} />
                                           <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-50 hover:opacity-100 transition-opacity" title="Delete Subject">
                                              <Trash2 size={16} />
                                           </Button>
                                        </form>
                                        <div className="text-muted-foreground ml-2 -mr-2 w-8 flex justify-center transition-transform duration-200">
                                           {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        </div>
                                     </div>
                                  </>
                               )}
                            </div>

                            {/* Accordion Body (Lessons List) */}
                            {isExpanded && !isEditingThisSubject && (
                               <div className="p-4 pt-0 bg-secondary/5 animate-in slide-in-from-top-2 duration-200">
                                  <div className="space-y-1 pl-1 border-l-2 border-primary/20 ml-2 mt-2">
                                     {subject.lessons?.sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any, lessonIndex: number) => {
                                        const isEditingThisLesson = editingLesson?.id === lesson.id;
                                        
                                        return (
                                        <div key={lesson.id} className="p-2 rounded group hover:bg-background/80 transition-colors border border-transparent hover:border-border/50">
                                           {isEditingThisLesson ? (
                                              <form action={handleUpdateLesson} className="flex gap-2 items-center w-full">
                                                  <input type="hidden" name="lessonId" value={lesson.id} />
                                                  <Input type="text" name="title" defaultValue={lesson.title} required className="h-8 text-xs flex-1" />
                                                  <Input type="text" name="youtube_id" defaultValue={lesson.youtube_id} required className="h-8 text-xs w-32" />
                                                  <Button type="submit" size="sm" className="h-8 text-xs shrink-0">Save</Button>
                                                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={() => setEditingLesson(null)}>Cancel</Button>
                                              </form>
                                           ) : (
                                              <div className="flex items-center justify-between w-full">
                                                 <div className="flex items-center gap-3 overflow-hidden">
                                                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                                       {lessonIndex + 1}
                                                    </span>
                                                    <div className="truncate">
                                                       <p className="text-sm font-medium truncate">{lesson.title}</p>
                                                       <p className="text-[10px] text-muted-foreground">ID: {lesson.youtube_id}</p>
                                                    </div>
                                                 </div>
                                                 <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <Button 
                                                       type="button" 
                                                       variant="ghost" 
                                                       size="icon" 
                                                       className="h-6 w-6 text-muted-foreground hover:text-primary"
                                                       onClick={() => setEditingLesson(lesson)}
                                                    >
                                                       <Edit2 size={12} />
                                                    </Button>
                                                    <form action={handleRemoveLesson}>
                                                       <input type="hidden" name="lessonId" value={lesson.id} />
                                                       <Button type="submit" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                                          <Trash2 size={12} />
                                                       </Button>
                                                    </form>
                                                 </div>
                                              </div>
                                           )}
                                        </div>
                                     )})}
      
                                     <form id={`form-add-lesson-${subject.id}`} action={handleAddLesson} className="flex gap-2 pt-3 mt-1 items-center border-t border-border/30">
                                        <input type="hidden" name="subject_id" value={subject.id} />
                                        <Input type="text" name="title" required className="h-8 text-xs flex-1 border-primary/20 shadow-sm" placeholder="Lesson Name..." />
                                        <Input type="text" name="youtube_id" required className="h-8 text-xs w-32 shadow-sm" placeholder="YouTube URL..." />
                                        <Button type="submit" variant="secondary" size="sm" className="h-8 text-xs shrink-0 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground shadow-sm">
                                           + Add Lesson
                                        </Button>
                                     </form>
                                  </div>
                               </div>
                            )}
                         </Card>
                         );
                      })}
                      
                      {course?.subjects?.length === 0 && (
                         <div className="text-center p-8 border border-dashed border-border rounded-lg">
                            <p className="text-muted-foreground italic text-sm">No subjects added. Create a block above.</p>
                         </div>
                      )}
                   </div>
                 </>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
