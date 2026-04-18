'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createCourseAction } from '@/app/admin/courses/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, PlusCircle } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? 'Initializing...' : 'Initialize Course'}
    </Button>
  );
}

export function CreateCourseDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <PlusCircle className="mr-2" size={18} />
        Create New Course
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
              <h2 className="text-2xl font-bold tracking-tight">Create New Course</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Add minimum details to initialize a course. You can add lessons later.
              </p>
            </div>

            <form action={createCourseAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course Title *</label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Advanced Diagnostics"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Briefly describe what this course covers..."
                  className="w-full px-3 py-2 border border-input bg-transparent rounded-md text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
