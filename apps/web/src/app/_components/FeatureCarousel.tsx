'use client'

import { useEffect, useState } from 'react'

const slides = [
  {
    label: 'Characters',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ color: '#c9a84c', fontSize: 13, borderBottom: '1px solid #c9a84c33', paddingBottom: 8 }}>
          ⚔ Aelindra Moonwhisper — Elf Ranger Lv.4
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: '#0e1825', border: '1px solid #c9a84c22', borderRadius: 4, padding: 10 }}>
            <div style={{ color: '#8ab0d4', fontSize: 11, marginBottom: 5 }}>HIT POINTS</div>
            <div style={{ background: '#0b1020', borderRadius: 2, height: 6, marginBottom: 4 }}>
              <div style={{ background: '#c9a84c', width: '72%', height: '100%', borderRadius: 2 }} />
            </div>
            <div style={{ color: '#c4d4e6', fontSize: 12 }}>43 / 60</div>
          </div>
          <div style={{ background: '#0e1825', border: '1px solid #c9a84c22', borderRadius: 4, padding: 10 }}>
            <div style={{ color: '#8ab0d4', fontSize: 11, marginBottom: 5 }}>XP BALANCE</div>
            <div style={{ color: '#c9a84c', fontSize: 18, fontWeight: 'bold' }}>247</div>
            <div style={{ color: '#8ab0d480', fontSize: 10 }}>available</div>
          </div>
        </div>
        <div style={{ background: '#0e1825', border: '1px solid #c9a84c22', borderRadius: 4, padding: 10 }}>
          <div style={{ color: '#8ab0d4', fontSize: 11, marginBottom: 8 }}>SKILLS</div>
          {[['Archery', 4], ['Stealth', 3], ['Lore', 2]] .map(([skill, rank]) => (
            <div key={String(skill)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ color: '#c4d4e6', fontSize: 12 }}>{skill}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} style={{ width: 10, height: 10, background: i < Number(rank) ? '#c9a84c' : '#c9a84c22', borderRadius: 2 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'Events',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ color: '#c9a84c', fontSize: 13, borderBottom: '1px solid #c9a84c33', paddingBottom: 8 }}>
          📅 Upcoming Events
        </div>
        {[
          { name: 'The Reckoning', date: 'Oct 15, 2026', registered: '4 / 20', badge: 'Upcoming', badgeColor: '#8ab0d4' },
          { name: 'The Siege of Thornwall', date: 'Aug 3, 2026', registered: '18 / 20', badge: 'Archived', badgeColor: '#c9a84c88' },
        ].map((ev) => (
          <div key={ev.name} style={{ background: '#0e1825', border: '1px solid #c9a84c22', borderRadius: 4, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ color: '#c4d4e6', fontSize: 13, fontWeight: 600 }}>{ev.name}</span>
              <span style={{ color: ev.badgeColor, fontSize: 10, border: `1px solid ${ev.badgeColor}`, borderRadius: 3, padding: '1px 6px' }}>{ev.badge}</span>
            </div>
            <div style={{ color: '#8ab0d4', fontSize: 11 }}>{ev.date}</div>
            <div style={{ color: '#c9a84c', fontSize: 11, marginTop: 4 }}>👥 {ev.registered} registered</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Store',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ color: '#c9a84c', fontSize: 13, borderBottom: '1px solid #c9a84c33', paddingBottom: 8 }}>
          🏪 Adventure Store
        </div>
        {[
          { name: 'Healing Potion', desc: 'Restores 10 HP instantly', price: 5 },
          { name: 'Silver Blade', desc: 'Effective against undead', price: 20 },
          { name: 'Forest Cloak', desc: '+2 to Stealth checks', price: 15 },
        ].map((item) => (
          <div key={item.name} style={{ background: '#0e1825', border: '1px solid #c9a84c22', borderRadius: 4, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#c4d4e6', fontSize: 13 }}>{item.name}</div>
              <div style={{ color: '#8ab0d4', fontSize: 11 }}>{item.desc}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ color: '#c9a84c', fontSize: 13, fontWeight: 'bold' }}>{item.price} XP</span>
              <span style={{ background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44', borderRadius: 3, padding: '2px 8px', fontSize: 10 }}>Buy</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
]

export function FeatureCarousel() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % slides.length), 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 8 }}>
        {slides.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setActive(i)}
            style={{
              background: i === active ? '#c9a84c22' : 'transparent',
              border: `1px solid ${i === active ? '#c9a84c' : '#c9a84c33'}`,
              color: i === active ? '#c9a84c' : '#8ab0d4',
              borderRadius: 4,
              padding: '4px 14px',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Slide content */}
      <div
        style={{
          background: '#0b1020',
          border: '1px solid #c9a84c33',
          borderRadius: 8,
          padding: 16,
          minHeight: 260,
        }}
      >
        {slides[active]?.content}
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i === active ? '#c9a84c' : '#c9a84c33',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      {/* CTA below carousel */}
      <div style={{ textAlign: 'center' }}>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            border: '1px solid #c9a84c',
            color: '#c9a84c',
            borderRadius: 6,
            padding: '10px 28px',
            fontSize: 14,
            textDecoration: 'none',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#c9a84c22' }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent' }}
        >
          Create a free account →
        </a>
      </div>
    </div>
  )
}
