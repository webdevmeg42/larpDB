import { z } from 'zod';
export declare const SetupInput: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
    gameName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    displayName: string;
    gameName: string;
}, {
    email: string;
    password: string;
    displayName: string;
    gameName: string;
}>;
export declare const LoginInput: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type SetupInput = z.infer<typeof SetupInput>;
export type LoginInput = z.infer<typeof LoginInput>;
//# sourceMappingURL=auth.d.ts.map