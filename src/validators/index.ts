import { z } from "zod";

// Request schemas belong here and should validate untrusted input at the API boundary.
export const emptyRequestSchema = z.object({});
