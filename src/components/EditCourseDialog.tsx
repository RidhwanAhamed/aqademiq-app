import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useCourses, useSemesters, Course } from "@/hooks/useCourses";

const courseSchema = z.object({
  name: z.string()
    .min(1, "Course name is required")
    .max(100, "Course name too long")
    .regex(/^[a-zA-Z0-9\s\-_&.()]+$/, "Course name contains invalid characters"),
  code: z.string()
    .optional()
    .refine(val => !val || /^[A-Z0-9\s\-]+$/i.test(val), "Course code contains invalid characters"),
  semester_id: z.string().min(1, "Please select a semester"),
  credits: z.number().min(1).max(10),
  instructor: z.string()
    .optional()
    .refine(val => !val || /^[a-zA-Z\s\-.']+$/.test(val), "Instructor name contains invalid characters"),
  color: z.string().min(1, "Please select a color"),
  target_grade: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface EditCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
}

const courseColors = [
  { name: "Blue", value: "blue", class: "bg-blue-500" },
  { name: "Red", value: "red", class: "bg-red-500" },
  { name: "Green", value: "green", class: "bg-green-500" },
  { name: "Purple", value: "purple", class: "bg-purple-500" },
  { name: "Orange", value: "orange", class: "bg-orange-500" },
  { name: "Pink", value: "pink", class: "bg-pink-500" },
  { name: "Indigo", value: "indigo", class: "bg-indigo-500" },
  { name: "Teal", value: "teal", class: "bg-teal-500" },
];

const grades = ["A", "B", "C", "D", "F"];

export function EditCourseDialog({ open, onOpenChange, course }: EditCourseDialogProps) {
  const [loading, setLoading] = useState(false);
  const { updateCourse } = useCourses();
  const { semesters } = useSemesters();

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      code: "",
      credits: 3,
      instructor: "",
      color: "",
      target_grade: "",
      semester_id: "",
    },
  });

  // Update form when course changes
  useEffect(() => {
    if (course) {
      form.reset({
        name: course.name,
        code: course.code || "",
        credits: course.credits,
        instructor: course.instructor || "",
        color: course.color,
        target_grade: course.target_grade || "",
        semester_id: course.semester_id,
      });
    }
  }, [course, form]);

  const onSubmit = async (data: CourseFormData) => {
    if (!course) return;
    
    setLoading(true);
    try {
      const success = await updateCourse(course.id, {
        name: data.name,
        code: data.code || '',
        semester_id: data.semester_id,
        credits: data.credits,
        instructor: data.instructor || '',
        color: data.color,
        target_grade: data.target_grade || '',
      });

      if (success) {
        toast({
          title: "Course updated successfully",
          description: `${data.name} has been updated.`,
        });
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Calculus II" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., MATH201" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="semester_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Semester</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {semesters.map((semester) => (
                        <SelectItem key={semester.id} value={semester.id}>
                          {semester.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Grade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {grades.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="instructor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructor (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Professor Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-4 gap-2">
                      {courseColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`
                            h-10 rounded-md border-2 ${color.class}
                            ${field.value === color.value 
                              ? 'border-foreground ring-2 ring-ring' 
                              : 'border-border hover:border-foreground'
                            }
                          `}
                          onClick={() => field.onChange(color.value)}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-gradient-primary">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
