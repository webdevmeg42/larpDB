export interface Palette {
  id: string
  name: string
  emoji: string
  colorPrimary: string
  colorSecondary: string
  colorBackground: string
  colorText: string
  colorAccent: string
}

export const PALETTES: Palette[] = [
  {
    id: 'wild-west',
    name: 'Wild West',
    emoji: '🤠',
    colorPrimary: '#8B4513',
    colorSecondary: '#D2691E',
    colorBackground: '#1A0E00',
    colorText: '#F5DEB3',
    colorAccent: '#DAA520',
  },
  {
    id: 'pirates-cove',
    name: "Pirate's Cove",
    emoji: '☠️',
    colorPrimary: '#1B6CA8',
    colorSecondary: '#20A4A4',
    colorBackground: '#0A1E2E',
    colorText: '#E8D5B7',
    colorAccent: '#C9A84C',
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌿',
    colorPrimary: '#2D6A2D',
    colorSecondary: '#5A9E3E',
    colorBackground: '#0B1A0B',
    colorText: '#F0EDD4',
    colorAccent: '#C9A84C',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    emoji: '⚡',
    colorPrimary: '#00FF9C',
    colorSecondary: '#FF2079',
    colorBackground: '#0D0D1A',
    colorText: '#D4D4FF',
    colorAccent: '#00D4FF',
  },
  {
    id: 'wasteland',
    name: 'Wasteland',
    emoji: '💀',
    colorPrimary: '#B84A2A',
    colorSecondary: '#C8A45A',
    colorBackground: '#1A1410',
    colorText: '#E8E0CC',
    colorAccent: '#D4622A',
  },
  {
    id: 'medieval',
    name: 'Medieval Kingdom',
    emoji: '⚔️',
    colorPrimary: '#1A3A8B',
    colorSecondary: '#C8952A',
    colorBackground: '#110D1A',
    colorText: '#F0E8D0',
    colorAccent: '#9B1C1C',
  },
  {
    id: 'dark-fantasy',
    name: 'Dark Fantasy',
    emoji: '🔮',
    colorPrimary: '#5B21B6',
    colorSecondary: '#7C3AED',
    colorBackground: '#0D0B1A',
    colorText: '#E5E0FF',
    colorAccent: '#DC2626',
  },
  {
    id: 'gothic',
    name: 'Gothic Vampire',
    emoji: '🧛',
    colorPrimary: '#8B0000',
    colorSecondary: '#B22222',
    colorBackground: '#0A0A0A',
    colorText: '#F5F5F5',
    colorAccent: '#C0C0C0',
  },
  {
    id: 'high-fantasy',
    name: 'High Fantasy',
    emoji: '✨',
    colorPrimary: '#1D4ED8',
    colorSecondary: '#059669',
    colorBackground: '#0F172A',
    colorText: '#F1F5F9',
    colorAccent: '#D97706',
  },
  {
    id: 'steampunk',
    name: 'Steampunk',
    emoji: '⚙️',
    colorPrimary: '#B5860D',
    colorSecondary: '#8B4513',
    colorBackground: '#1A1410',
    colorText: '#E8D5B5',
    colorAccent: '#B45309',
  },
]
