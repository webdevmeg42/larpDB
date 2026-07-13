'use client'

import { useAuth } from '@/hooks/useAuth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { NpcsTab } from './_components/NpcsTab'
import { EventsTab } from './_components/EventsTab'
import { CharactersTab } from './_components/CharactersTab'
import { MembersTab } from './_components/MembersTab'
import { SubscriptionsTab } from './_components/SubscriptionsTab'

export default function CommunityPage() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'owner' && user.role !== 'gm') {
    return <div className="p-6 text-muted-foreground">GM or owner role required.</div>
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">Admin</h1>

      <Tabs defaultValue="events">
        <TabsList className="mb-6">
          <TabsTrigger value="events">Event Management</TabsTrigger>
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="npcs">NPCs</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <EventsTab />
        </TabsContent>

        <TabsContent value="characters">
          <CharactersTab />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab />
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionsTab />
        </TabsContent>

        <TabsContent value="npcs">
          <NpcsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
