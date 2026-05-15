'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateCourseAction } from '@/app/admin/courses/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, Edit2 } from 'lucide-react';
import type { Course } from '@/types/lms';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}

export function EditCourseDialog({ course }: { course: Course }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    await updateCourseAction(formData);
    setIsOpen(false);
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="text-muted-foreground hover:text-primary">
        <Edit2 size={16} />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="max-w-xl w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Edit Course</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Update the foundational details for this course.
              </p>
            </div>

            <form action={handleSubmit} className="space-y-4">
              <input type="hidden" name="courseId" value={course.id} />
              
              <div className="space-y-2">
                <label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course Title *</label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  required
                  defaultValue={course.title}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={course.description || ''}
                  className="w-full px-3 py-2 border border-input bg-transparent rounded-md text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="thumbnail_url" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thumbnail URL</label>
                <Input
                  id="thumbnail_url"
                  name="thumbnail_url"
                  type="url"
                  defaultValue={course.thumbnail_url || ''}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-4 pt-4 mt-6 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <SubmitButton />
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
