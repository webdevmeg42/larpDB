export type SchemaFieldType = 'text' | 'longtext' | 'number' | 'select' | 'multiselect' | 'toggle' | 'statblock' | 'section';
export interface SchemaFieldOption {
    value: string;
    label: string;
    xpCost?: number;
}
export interface StatBlockStat {
    key: string;
    label: string;
    min?: number;
    max?: number;
    xpCostPerPoint?: number;
}
export interface SchemaField {
    id: string;
    label: string;
    type: SchemaFieldType;
    required: boolean;
    order: number;
    min?: number;
    max?: number;
    xpCostPerPoint?: number;
    options?: SchemaFieldOption[];
    maxSelections?: number;
    stats?: StatBlockStat[];
    xpCost?: number;
}
export interface CharacterSchema {
    id: string;
    name: string;
    version: number;
    fields: SchemaField[];
    templateSource: string | null;
    isActive: boolean;
    createdAt: string;
}
export interface SchemaTemplate {
    id: string;
    name: string;
    genre: string;
    description: string | null;
    fields: SchemaField[];
    isBuiltin: boolean;
}
export interface Character {
    id: string;
    userId: string;
    schemaId: string;
    name: string;
    portraitUrl: string | null;
    data: Record<string, unknown>;
    totalXp: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=character.d.ts.map