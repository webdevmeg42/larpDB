import { z } from 'zod';
export const SetupInput = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(1).max(100),
    gameName: z.string().min(1).max(200),
});
export const LoginInput = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
//# sourceMappingURL=auth.js.map