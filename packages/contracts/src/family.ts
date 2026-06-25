import { z } from 'zod';

export const FamilyRoleSchema = z.enum(['OWNER', 'MEMBER']);

export type FamilyRole = z.infer<typeof FamilyRoleSchema>;

export const CreateFamilyGroupSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

export type CreateFamilyGroupDto = z.infer<typeof CreateFamilyGroupSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email(),
});

export type InviteMemberDto = z.infer<typeof InviteMemberSchema>;

export const FamilyGroupResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  createdAt: z.string().datetime(),
  members: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      name: z.string().nullable(),
      email: z.string(),
      role: FamilyRoleSchema,
      joinedAt: z.string().datetime(),
    }),
  ),
});

export type FamilyGroupResponse = z.infer<typeof FamilyGroupResponseSchema>;
