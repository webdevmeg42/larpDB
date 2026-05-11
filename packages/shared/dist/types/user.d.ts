export type UserRole = 'owner' | 'gm' | 'player';
export interface User {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    role: UserRole;
    createdAt: string;
}
export interface AuthUser extends User {
    token: string;
}
//# sourceMappingURL=user.d.ts.map