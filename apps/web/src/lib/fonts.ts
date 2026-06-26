export interface Font {
  id: string
  name: string
  family: string
  googleFamily: string
  theme: string
}

export const FONTS: Font[] = [
  {
    id: 'cinzel',
    name: 'Cinzel',
    family: "'Cinzel', serif",
    googleFamily: 'Cinzel:wght@400;700',
    theme: 'Medieval · Fantasy',
  },
  {
    id: 'cinzel-decorative',
    name: 'Cinzel Decorative',
    family: "'Cinzel Decorative', serif",
    googleFamily: 'Cinzel+Decorative:wght@400;700',
    theme: 'Ornate',
  },
  {
    id: 'uncial-antiqua',
    name: 'Uncial Antiqua',
    family: "'Uncial Antiqua', serif",
    googleFamily: 'Uncial+Antiqua',
    theme: 'Celtic · Elf',
  },
  {
    id: 'pirata-one',
    name: 'Pirata One',
    family: "'Pirata One', cursive",
    googleFamily: 'Pirata+One',
    theme: 'Pirate',
  },
  {
    id: 'rye',
    name: 'Rye',
    family: "'Rye', serif",
    googleFamily: 'Rye',
    theme: 'Wild West',
  },
  {
    id: 'orbitron',
    name: 'Orbitron',
    family: "'Orbitron', sans-serif",
    googleFamily: 'Orbitron:wght@400;700',
    theme: 'Cyberpunk',
  },
  {
    id: 'rajdhani',
    name: 'Rajdhani',
    family: "'Rajdhani', sans-serif",
    googleFamily: 'Rajdhani:wght@400;600',
    theme: 'Tech · Wasteland',
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    family: "'Playfair Display', serif",
    googleFamily: 'Playfair+Display:wght@400;700',
    theme: 'Gothic · Vampire',
  },
  {
    id: 'im-fell',
    name: 'IM Fell English',
    family: "'IM Fell English', serif",
    googleFamily: 'IM+Fell+English',
    theme: 'Manuscript · Pirate',
  },
  {
    id: 'oswald',
    name: 'Oswald',
    family: "'Oswald', sans-serif",
    googleFamily: 'Oswald:wght@400;600',
    theme: 'Wasteland · Bold',
  },
]

export function loadFont(googleFamily: string): void {
  const id = `gfont-${googleFamily.split(':')[0]!.replace(/\+/g, '-').toLowerCase()}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${googleFamily}&display=swap`
  document.head.appendChild(link)
}
