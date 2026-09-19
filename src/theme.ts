import type { Season } from './store'

export interface SeasonTheme {
  label: string
  icon: string
  canopyColors: string[]
  canopyVisible: boolean
  snowOnBranches: boolean
  groundColor: string
  groundColorNight: string
  fogColor: string
  pondColor: string
  particle: {
    colors: string[]
    shape: 'petal' | 'leaf' | 'snow'
    count: number
    fallSpeed: number
    sway: number
    size: number
  }
}

export const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

export const SEASON_THEME: Record<Season, SeasonTheme> = {
  spring: {
    label: 'Spring',
    icon: '\u{1F338}',
    canopyColors: ['#ffc4d6', '#ffb0c9', '#ff9ebb', '#ffd9e6'],
    canopyVisible: true,
    snowOnBranches: false,
    groundColor: '#8fc47a',
    groundColorNight: '#3a5636',
    fogColor: '#608650',
    pondColor: '#8fb8c9',
    particle: {
      colors: ['#ffc4d6', '#ffb0c9', '#fff0f4'],
      shape: 'petal',
      count: 90,
      fallSpeed: 0.4,
      sway: 1,
      size: 0.11,
    },
  },
  summer: {
    label: 'Summer',
    icon: '\u{1F33F}',
    canopyColors: ['#4f9150', '#3c7a3e', '#5aa457', '#6fbf62'],
    canopyVisible: true,
    snowOnBranches: false,
    groundColor: '#5fa04e',
    groundColorNight: '#25401f',
    fogColor: '#346926',
    pondColor: '#6fa9b8',
    particle: {
      colors: ['#4f9150', '#5aa457', '#6fbf62'],
      shape: 'leaf',
      count: 30,
      fallSpeed: 0.35,
      sway: 0.8,
      size: 0.1,
    },
  },
  autumn: {
    label: 'Autumn',
    icon: '\u{1F342}',
    canopyColors: ['#d9702e', '#c1432a', '#e0a63e', '#b8501f'],
    canopyVisible: true,
    snowOnBranches: false,
    groundColor: '#b98a4b',
    groundColorNight: '#4a3620',
    fogColor: '#79582d',
    pondColor: '#7a8f8a',
    particle: {
      colors: ['#d9702e', '#c1432a', '#e0a63e'],
      shape: 'leaf',
      count: 100,
      fallSpeed: 0.42,
      sway: 1.3,
      size: 0.11,
    },
  },
  winter: {
    label: 'Winter',
    icon: '❄️',
    canopyColors: ['#f2f5f7', '#e5edf1', '#ffffff'],
    canopyVisible: false,
    snowOnBranches: true,
    groundColor: '#eef2f5',
    groundColorNight: '#8fa3ad',
    fogColor: '#bcd9e8',
    pondColor: '#c3d6dd',
    particle: {
      colors: ['#ffffff', '#f0f6fa'],
      shape: 'snow',
      count: 450,
      fallSpeed: 0.22,
      sway: 0.6,
      size: 0.028,
    },
  },
}
