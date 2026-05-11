import { z } from 'zod';
export const UpdateSiteConfigInput = z.object({
    siteTitle: z.string().min(1).max(200).optional(),
    tagline: z.string().max(300).nullable().optional(),
    logoUrl: z.string().url().nullable().optional(),
    faviconUrl: z.string().url().nullable().optional(),
    bannerUrl: z.string().url().nullable().optional(),
    colorPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    colorSecondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    colorBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    colorText: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    colorAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    fontHeading: z.string().min(1).max(100).optional(),
    fontBody: z.string().min(1).max(100).optional(),
    welcomeMessage: z.string().max(2000).nullable().optional(),
    footerText: z.string().max(500).nullable().optional(),
    customCss: z.string().max(10000).nullable().optional(),
});
//# sourceMappingURL=game.js.map