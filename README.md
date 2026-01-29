# Violin AI - Adaptive Practice Assistant

An AI-powered violin practice assistant that generates exercises, provides real-time feedback, and adapts to your skill level.

## Features

- **AI-Generated Exercises**: Generates MusicXML exercises tailored to your difficulty level and focus area
- **Sheet Music Display**: Beautiful music notation rendering using OpenSheetMusicDisplay
- **Real-Time Pitch Detection**: Listens to your playing and shows pitch accuracy in real-time
- **Comprehensive Feedback**: Analyzes pitch, rhythm, dynamics, and phrasing
- **Adaptive Difficulty**: Automatically adjusts difficulty based on your performance
- **Audio Playback**: Hear reference performances of exercises

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Sheet Music**: OpenSheetMusicDisplay (OSMD)
- **Audio Playback**: Tone.js
- **Pitch Detection**: Pitchy (McLeod algorithm)
- **AI**: OpenAI GPT-4 (exercise generation and feedback)
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key (optional, for AI-powered features)

### Installation

1. Clone the repository:
```bash
cd violin_ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your OpenAI API key to `.env.local`:
```
OPENAI_API_KEY=sk-your-api-key-here
```

> **Note**: The app works without an API key using fallback generators, but AI-powered exercise generation and feedback require a valid OpenAI API key.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Usage

1. **Enable Microphone**: Click "Enable Microphone" to grant audio access
2. **Set Difficulty**: Use the slider to set your skill level (1-10)
3. **Choose Focus**: Select scales, arpeggios, bowing, rhythm, or mixed
4. **Generate Exercise**: Click "Generate" to create a new exercise
5. **Play Reference**: Click "Play" to hear the exercise
6. **Record Performance**: Click "Record" and play along with your violin
7. **Get Feedback**: After recording, receive detailed feedback on your performance
8. **Adaptive Progress**: The app will adjust difficulty based on your scores

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate-exercise/   # Exercise generation endpoint
│   │   └── analyze-performance/ # Performance analysis endpoint
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── sheet-music/             # Music notation display
│   ├── audio/                   # Audio controls and visualizers
│   ├── feedback/                # Feedback panel
│   └── difficulty/              # Difficulty settings
├── hooks/
│   ├── useAudioCapture.ts       # Microphone handling
│   ├── usePlayback.ts           # Audio playback
│   └── useExerciseSession.ts    # Main session management
├── lib/
│   ├── ai/                      # AI agents
│   │   ├── music-generator.ts   # Exercise generation
│   │   ├── feedback-agent.ts    # Performance analysis
│   │   └── difficulty-agent.ts  # Adaptive difficulty
│   ├── audio/                   # Audio processing
│   │   ├── pitch-detector.ts    # Pitch detection
│   │   ├── audio-analyzer.ts    # Audio analysis
│   │   └── playback.ts          # Tone.js playback
│   └── music/
│       └── musicxml-utils.ts    # MusicXML parsing
├── stores/
│   └── session-store.ts         # Zustand state store
└── types/
    └── index.ts                 # TypeScript definitions
```

## Difficulty Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Beginner | Open strings, simple rhythms |
| 2 | Elementary | First position basics |
| 3 | Elementary+ | Simple slurs and dynamics |
| 4 | Intermediate | Shifting introduction |
| 5 | Intermediate+ | Vibrato and positions 1-3 |
| 6 | Advanced | Extended positions, spiccato |
| 7 | Advanced+ | Double stops, harmonics |
| 8 | Pre-Professional | Concert-level techniques |
| 9 | Professional | Virtuosic passages |
| 10 | Master | Concert soloist level |

## Adaptive Algorithm

The app uses a "Zone of Proximal Development" approach:
- Score ≥85% for 3 consecutive exercises → Difficulty increases
- Score <60% for 2 consecutive exercises → Difficulty decreases
- Otherwise → Maintain level and focus on weak areas

## Deployment

This app is optimized for [Vercel](https://vercel.com):

```bash
npm run build
vercel deploy
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | Optional |

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
