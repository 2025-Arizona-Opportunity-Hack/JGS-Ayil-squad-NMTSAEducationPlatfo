import { z } from "zod";

// Content form validation schema
export const contentFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional().or(z.literal("")),
  type: z.enum(["video", "article", "document", "audio"], {
    message: "Content type is required",
  }),
  externalUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  richTextContent: z.string().optional().or(z.literal("")),
  body: z.string().optional().or(z.literal("")),
  isPublic: z.boolean(),
  tags: z.string().optional().or(z.literal("")),
  active: z.boolean(),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
}).refine((data) => {
  // Validate that end date is after start date if both are provided
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start < end;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export type ContentFormData = z.infer<typeof contentFormSchema>;

// Access management form validation schema
export const accessManagementSchema = z.object({
  isPublic: z.boolean().default(false),
  selectedUsers: z.array(z.string()).default([]),
  selectedRoles: z.array(z.string()).default([]),
  selectedUserGroups: z.array(z.string()).default([]),
  canShare: z.boolean().default(false),
  expiresAt: z.string().optional(),
}).refine((data) => {
  // At least one access type should be selected if not public
  if (!data.isPublic) {
    return data.selectedUsers.length > 0 || 
           data.selectedRoles.length > 0 || 
           data.selectedUserGroups.length > 0;
  }
  return true;
}, {
  message: "Please select at least one user, role, or group, or make the content public",
  path: ["selectedUsers"],
});

export type AccessManagementFormData = z.infer<typeof accessManagementSchema>;

// Review form validation schema
export const reviewFormSchema = z.object({
  reviewNotes: z.string().optional(),
});

export type ReviewFormData = z.infer<typeof reviewFormSchema>;

// Reject form validation schema (requires notes)
export const rejectFormSchema = z.object({
  reviewNotes: z.string().min(1, "Review notes are required when rejecting content"),
});

export type RejectFormData = z.infer<typeof rejectFormSchema>;

