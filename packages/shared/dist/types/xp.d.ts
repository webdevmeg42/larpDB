export type XPTransactionType = 'award' | 'spend';
export interface XPTransaction {
    id: string;
    characterId: string;
    awardedBy: string | null;
    amount: number;
    reason: string;
    type: XPTransactionType;
    createdAt: string;
}
//# sourceMappingURL=xp.d.ts.map