import type { AuthUser } from '@/lib/auth'
import { HELP_ENTRIES, canSeeEntry } from '@/lib/help-content'

interface HelpPageClientProps {
  role: AuthUser['role']
}

export function HelpPageClient({ role }: HelpPageClientProps) {
  const entries = HELP_ENTRIES.filter(e => canSeeEntry(role, e))

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Help & Documentation</h1>
      <p className="text-muted-foreground mb-8">Guides for everything in PlotRunner.</p>
      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No help articles are available for your role.</p>
      )}
      {entries.map(entry => (
        <section key={entry.slug} className="mb-10">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b">{entry.title}</h2>
          {entry.sections.map((section, idx) => (
            <div key={`${section.heading}-${idx}`} className="mb-4">
              <h3 className="text-sm font-semibold mb-1">{section.heading}</h3>
              <p className="text-sm text-muted-foreground">{section.body}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
