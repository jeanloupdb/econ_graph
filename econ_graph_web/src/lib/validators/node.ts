import { z } from 'zod';

/**
 * Zod schemas for node validation (algo-only)
 */

const nodeIdPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export const nodeCreateSchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .regex(nodeIdPattern, 'ID must start with a letter and contain only letters, numbers, hyphens, and underscores')
    .max(50, 'ID must be at most 50 characters'),
  label: z
    .string()
    .min(1, 'Label is required')
    .max(200, 'Label must be at most 200 characters'),
  unit: z.string().optional(),
  status: z.enum(['unknown', 'observed', 'imposed', 'implied', 'invalid']),
  confidence: z
    .number({ message: 'Confidence is required' })
    .min(0, 'Confidence must be between 0 and 1')
    .max(1, 'Confidence must be between 0 and 1'),
  notes: z.string().optional(),
  computation_definition: z.string().optional(),
});

export const nodeUpdateSchema = z.object({
  label: z
    .string()
    .min(1, 'Label cannot be empty')
    .max(200, 'Label must be at most 200 characters')
    .optional(),
  unit: z.string().optional(),
  status: z.enum(['unknown', 'observed', 'imposed', 'implied', 'invalid']).optional(),
  confidence: z
    .number()
    .min(0, 'Confidence must be between 0 and 1')
    .max(1, 'Confidence must be between 0 and 1')
    .optional(),
  notes: z.string().optional(),
  computation_definition: z.string().optional(),
});

export type NodeCreateInput = z.infer<typeof nodeCreateSchema>;
export type NodeUpdateInput = z.infer<typeof nodeUpdateSchema>;
