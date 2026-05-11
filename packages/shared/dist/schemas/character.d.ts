import { z } from 'zod';
export declare const SchemaFieldOptionSchema: z.ZodObject<{
    value: z.ZodString;
    label: z.ZodString;
    xpCost: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    value: string;
    label: string;
    xpCost?: number | undefined;
}, {
    value: string;
    label: string;
    xpCost?: number | undefined;
}>;
export declare const StatBlockStatSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    min: z.ZodOptional<z.ZodNumber>;
    max: z.ZodOptional<z.ZodNumber>;
    xpCostPerPoint: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    label: string;
    key: string;
    min?: number | undefined;
    max?: number | undefined;
    xpCostPerPoint?: number | undefined;
}, {
    label: string;
    key: string;
    min?: number | undefined;
    max?: number | undefined;
    xpCostPerPoint?: number | undefined;
}>;
export declare const SchemaFieldSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<["text", "longtext", "number", "select", "multiselect", "toggle", "statblock", "section"]>;
    required: z.ZodBoolean;
    order: z.ZodNumber;
    min: z.ZodOptional<z.ZodNumber>;
    max: z.ZodOptional<z.ZodNumber>;
    xpCostPerPoint: z.ZodOptional<z.ZodNumber>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodString;
        xpCost: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
        xpCost?: number | undefined;
    }, {
        value: string;
        label: string;
        xpCost?: number | undefined;
    }>, "many">>;
    maxSelections: z.ZodOptional<z.ZodNumber>;
    stats: z.ZodOptional<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        min: z.ZodOptional<z.ZodNumber>;
        max: z.ZodOptional<z.ZodNumber>;
        xpCostPerPoint: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        key: string;
        min?: number | undefined;
        max?: number | undefined;
        xpCostPerPoint?: number | undefined;
    }, {
        label: string;
        key: string;
        min?: number | undefined;
        max?: number | undefined;
        xpCostPerPoint?: number | undefined;
    }>, "many">>;
    xpCost: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "number" | "text" | "longtext" | "select" | "multiselect" | "toggle" | "statblock" | "section";
    label: string;
    id: string;
    required: boolean;
    order: number;
    options?: {
        value: string;
        label: string;
        xpCost?: number | undefined;
    }[] | undefined;
    xpCost?: number | undefined;
    min?: number | undefined;
    max?: number | undefined;
    xpCostPerPoint?: number | undefined;
    maxSelections?: number | undefined;
    stats?: {
        label: string;
        key: string;
        min?: number | undefined;
        max?: number | undefined;
        xpCostPerPoint?: number | undefined;
    }[] | undefined;
}, {
    type: "number" | "text" | "longtext" | "select" | "multiselect" | "toggle" | "statblock" | "section";
    label: string;
    id: string;
    required: boolean;
    order: number;
    options?: {
        value: string;
        label: string;
        xpCost?: number | undefined;
    }[] | undefined;
    xpCost?: number | undefined;
    min?: number | undefined;
    max?: number | undefined;
    xpCostPerPoint?: number | undefined;
    maxSelections?: number | undefined;
    stats?: {
        label: string;
        key: string;
        min?: number | undefined;
        max?: number | undefined;
        xpCostPerPoint?: number | undefined;
    }[] | undefined;
}>;
export type SchemaFieldInput = z.infer<typeof SchemaFieldSchema>;
//# sourceMappingURL=character.d.ts.map