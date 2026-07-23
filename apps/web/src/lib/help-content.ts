export type MinRole = 'player' | 'gm' | 'owner'

export interface HelpSection {
  heading: string
  body: string
}

export interface HelpEntry {
  slug: string
  title: string
  minRole: MinRole
  paths: string[]
  sections: HelpSection[]
}

const ROLE_LEVEL: Record<MinRole, number> = { player: 0, gm: 1, owner: 2 }

export function canSeeEntry(userRole: string, entry: HelpEntry): boolean {
  return ((ROLE_LEVEL as Record<string, number | undefined>)[userRole] ?? -1) >= ROLE_LEVEL[entry.minRole]
}

export function findEntryForPath(
  pathname: string,
  userRole: string,
  entries: HelpEntry[] = HELP_ENTRIES,
): HelpEntry | null {
  let best: HelpEntry | null = null
  let bestLen = -1
  for (const entry of entries) {
    if (!canSeeEntry(userRole, entry)) continue
    for (const p of entry.paths) {
      if ((pathname === p || pathname.startsWith(p + '/')) && p.length > bestLen) {
        bestLen = p.length
        best = entry
      }
    }
  }
  return best
}

export const HELP_ENTRIES: HelpEntry[] = [
  {
    slug: 'dashboard',
    title: 'Dashboard',
    minRole: 'player',
    paths: ['/dashboard'],
    sections: [
      {
        heading: 'What is the dashboard?',
        body: "The dashboard is your home base. It shows the latest announcements and posts from your game masters, so you always know what's going on.",
      },
      {
        heading: 'How do I use it?',
        body: 'Scroll down to read announcements. You can like posts by clicking the heart icon and leave a comment at the bottom of each post.',
      },
    ],
  },
  {
    slug: 'characters',
    title: 'My Characters',
    minRole: 'player',
    paths: ['/characters'],
    sections: [
      {
        heading: 'What are characters?',
        body: "A character is the persona you play in the game — your in-game identity. You can have one character per game you're a member of.",
      },
      {
        heading: "What's on my character page?",
        body: 'Your character page shows your stats, abilities, equipment, and experience points (XP). Your game master updates these during and after events.',
      },
      {
        heading: 'How do I create a character?',
        body: 'Click "New Character" and fill in your character\'s name. Your game master will set up the rest of your character details.',
      },
    ],
  },
  {
    slug: 'profile',
    title: 'My Profile',
    minRole: 'player',
    paths: ['/profile'],
    sections: [
      {
        heading: 'What is my profile?',
        body: 'Your profile holds your account information: your display name, email address, and password.',
      },
      {
        heading: 'How do I update my profile?',
        body: 'Type your new display name or email into the fields and click Save. To change your password, fill in the Password section and click Update Password.',
      },
    ],
  },
  {
    slug: 'events',
    title: 'Events',
    minRole: 'player',
    paths: ['/events'],
    sections: [
      {
        heading: 'What are events?',
        body: "Events are game sessions your group organizes. Each event has a date, time, and location. Your game masters publish events when they're ready for sign-ups.",
      },
      {
        heading: 'How do I sign up for an event?',
        body: "Click an event to open it, then click Register. Your game master will confirm your spot. You'll see your registration status on the event page.",
      },
      {
        heading: 'What do the statuses mean?',
        body: "Confirmed means you're in. Waitlist means the event is full but you'll be let in if someone cancels. Pending means your game master hasn't confirmed you yet.",
      },
    ],
  },
  {
    slug: 'rulebook',
    title: 'Rulebook',
    minRole: 'player',
    paths: ['/rulebook'],
    sections: [
      {
        heading: 'What is the rulebook?',
        body: 'The rulebook contains all the rules and lore for your game. Your game masters write and maintain it.',
      },
      {
        heading: 'How do I read it?',
        body: 'Browse the list of chapters and click any chapter title to open and read it.',
      },
    ],
  },
  {
    slug: 'community',
    title: 'Community & Posts',
    minRole: 'gm',
    paths: ['/admin/community', '/admin/posts'],
    sections: [
      {
        heading: 'What is the Community section?',
        body: "Community is where you manage announcements and posts visible to your game's players. Use it to share news, event reminders, and story updates.",
      },
      {
        heading: 'How do I create a post?',
        body: 'Go to Posts and click New Post. Write your content, then click Publish to make it visible to all members. Posts appear on the dashboard for all players in your game.',
      },
    ],
  },
  {
    slug: 'users',
    title: 'Members & Users',
    minRole: 'owner',
    paths: ['/admin/users'],
    sections: [
      {
        heading: 'What is the Users tab?',
        body: 'The Users tab shows all members of your game and lets you manage their roles and membership status.',
      },
      {
        heading: "How do I change someone's role?",
        body: 'Find the member in the list, open their row, and use the role dropdown to promote them to GM or set them back to player. Role changes take effect immediately.',
      },
    ],
  },
  {
    slug: 'adventures',
    title: 'Adventure Builder',
    minRole: 'owner',
    paths: ['/adventures'],
    sections: [
      {
        heading: 'What is the Adventure Builder?',
        body: "The Adventure Builder is where you set up and customize your game. You can configure your game's name, description, rulebook, character templates, store, and more.",
      },
      {
        heading: 'How do I get started?',
        body: "Click your adventure to open the builder, then use the tabs to configure each section. Start with Branding to set your game's name and appearance.",
      },
      {
        heading: 'What are Race and Class builds?',
        body: 'Race and Class builds are templates that define what stats and abilities players can choose when creating their characters. You can use a preset template or build your own from scratch.',
      },
    ],
  },
]
