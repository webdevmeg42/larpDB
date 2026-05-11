export type EventStatus = 'draft' | 'published' | 'archived';
export type RegistrationStatus = 'pending' | 'confirmed' | 'waitlist' | 'cancelled';
export interface LarpEvent {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    startAt: string;
    endAt: string | null;
    maxPlayers: number | null;
    status: EventStatus;
    createdAt: string;
}
export interface EventRegistration {
    id: string;
    eventId: string;
    userId: string;
    characterId: string | null;
    status: RegistrationStatus;
    registeredAt: string;
}
//# sourceMappingURL=event.d.ts.map