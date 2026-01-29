import type { TheoryLesson, TheoryQuiz, TheoryTopic, ExerciseMetadata } from '@/types';

// Pre-built theory lessons for common topics
export const THEORY_LESSONS: Record<TheoryTopic, TheoryLesson> = {
  scales: {
    id: 'lesson-scales',
    topic: 'scales',
    title: 'Understanding Scales',
    content: `A scale is a series of notes arranged in ascending or descending order. On the violin, scales are fundamental for developing finger patterns, intonation, and overall technique.

**Major Scales** follow the pattern: Whole-Whole-Half-Whole-Whole-Whole-Half (W-W-H-W-W-W-H)

**Minor Scales** come in three forms:
- Natural Minor: W-H-W-W-H-W-W
- Harmonic Minor: Raised 7th degree
- Melodic Minor: Raised 6th and 7th ascending, natural descending

**Why Scales Matter for Violinists:**
1. Build muscle memory for finger patterns
2. Develop consistent intonation
3. Improve shifting between positions
4. Create a foundation for learning pieces`,
    examples: [
      {
        description: 'G Major Scale on Violin',
        notation: 'G A B C D E F# G (open G to 3rd position)',
        audioDescription: 'Start on open G string, use first finger for A, second for B, etc.',
      },
      {
        description: 'A Minor Natural Scale',
        notation: 'A B C D E F G A',
        audioDescription: 'No sharps or flats, creating a melancholic sound.',
      },
    ],
    keyTakeaways: [
      'Major scales have a bright, happy quality',
      'Minor scales have a darker, sadder quality',
      'The pattern of whole and half steps defines each scale type',
      'Practice scales slowly with a tuner for best results',
    ],
    relatedTopics: ['keys', 'intervals'],
  },
  intervals: {
    id: 'lesson-intervals',
    topic: 'intervals',
    title: 'Mastering Intervals',
    content: `An interval is the distance between two notes. Understanding intervals helps with intonation, sight-reading, and ear training.

**Common Intervals:**
- Unison (same note): No distance
- Second: Two adjacent notes (C to D)
- Third: Skip one note (C to E) - Major or minor
- Fourth: Skip two notes (C to F) - Perfect
- Fifth: Skip three notes (C to G) - Perfect
- Sixth: Skip four notes (C to A) - Major or minor
- Seventh: Skip five notes (C to B) - Major or minor
- Octave: Same note, different register (C to C)

**Quality of Intervals:**
- Perfect: Unisons, 4ths, 5ths, Octaves
- Major/Minor: 2nds, 3rds, 6ths, 7ths
- Augmented: One half-step larger than major/perfect
- Diminished: One half-step smaller than minor/perfect`,
    examples: [
      {
        description: 'Perfect Fifth (C to G)',
        notation: 'C → G',
        audioDescription: 'Sounds stable and consonant, like the opening of "Twinkle Twinkle"',
      },
      {
        description: 'Major Third (C to E)',
        notation: 'C → E',
        audioDescription: 'Bright and happy, fundamental to major chords',
      },
    ],
    keyTakeaways: [
      'Train your ear to recognize intervals by associating them with songs',
      'Perfect fifth = "Twinkle Twinkle Little Star"',
      'Major second = "Happy Birthday"',
      'Interval recognition improves sight-reading',
    ],
    relatedTopics: ['scales', 'chords'],
  },
  keys: {
    id: 'lesson-keys',
    topic: 'keys',
    title: 'Key Signatures Explained',
    content: `A key signature indicates which notes are consistently sharped or flatted throughout a piece. Understanding keys helps you anticipate finger patterns on the violin.

**Circle of Fifths:**
Moving clockwise adds sharps: C → G → D → A → E → B → F# → C#
Moving counter-clockwise adds flats: C → F → Bb → Eb → Ab → Db → Gb → Cb

**Common Violin-Friendly Keys:**
- G Major (1 sharp: F#) - Very common, open strings work well
- D Major (2 sharps: F#, C#) - Extremely common for violin
- A Major (3 sharps: F#, C#, G#) - Natural for violin
- E Major (4 sharps) - Brilliant sound

**Relative Major/Minor:**
Every major key has a relative minor that shares the same key signature:
- C Major ↔ A minor
- G Major ↔ E minor
- D Major ↔ B minor`,
    examples: [
      {
        description: 'D Major Key Signature',
        notation: 'F# and C# are sharped',
        audioDescription: 'Bright and brilliant, perfect for violin',
      },
      {
        description: 'G Major Key Signature',
        notation: 'Only F# is sharped',
        audioDescription: 'Open and resonant on violin',
      },
    ],
    keyTakeaways: [
      'Key signatures eliminate the need to write accidentals repeatedly',
      'Sharps are added in order: F C G D A E B',
      'Flats are added in order: B E A D G C F',
      'Violin music often uses sharp keys (D, A, E, G)',
    ],
    relatedTopics: ['scales', 'intervals'],
  },
  rhythm: {
    id: 'lesson-rhythm',
    topic: 'rhythm',
    title: 'Rhythm Fundamentals',
    content: `Rhythm is the pattern of sounds and silences in music. On violin, good rhythm comes from coordinating bow speed and subdivision.

**Note Values (in 4/4 time):**
- Whole note: 4 beats (○)
- Half note: 2 beats (d)
- Quarter note: 1 beat (♩)
- Eighth note: 1/2 beat (♪)
- Sixteenth note: 1/4 beat (♬)

**Time Signatures:**
- 4/4 (Common time): 4 quarter notes per measure
- 3/4 (Waltz time): 3 quarter notes per measure
- 6/8 (Compound duple): 6 eighth notes, grouped in 2s
- 2/4 (March time): 2 quarter notes per measure

**Subdividing:**
Always feel the smallest subdivision to maintain steady rhythm. If playing quarter notes, think eighth notes internally.`,
    examples: [
      {
        description: 'Dotted Rhythm',
        notation: '♩. ♪ = dotted quarter + eighth',
        audioDescription: 'Long-short pattern, common in marches',
      },
      {
        description: 'Triplets',
        notation: '3 notes in the space of 2',
        audioDescription: 'Creates a flowing, rolling feel',
      },
    ],
    keyTakeaways: [
      'Use a metronome to develop internal pulse',
      'Subdivide mentally for accurate rhythm',
      'Tap or count rhythms before playing',
      'Rhythm and bow distribution are connected',
    ],
    relatedTopics: ['dynamics', 'articulation'],
  },
  dynamics: {
    id: 'lesson-dynamics',
    topic: 'dynamics',
    title: 'Expression Through Dynamics',
    content: `Dynamics refer to the volume levels in music. On violin, dynamics are primarily controlled through bow pressure, speed, and contact point.

**Dynamic Markings (quietest to loudest):**
- ppp (pianississimo): Very very soft
- pp (pianissimo): Very soft
- p (piano): Soft
- mp (mezzo piano): Medium soft
- mf (mezzo forte): Medium loud
- f (forte): Loud
- ff (fortissimo): Very loud
- fff (fortississimo): Very very loud

**Gradual Changes:**
- Crescendo (<): Gradually louder
- Diminuendo/Decrescendo (>): Gradually softer

**Violin-Specific Techniques:**
- Bow speed: Faster = louder, slower = softer
- Bow pressure: More weight = louder
- Contact point: Closer to bridge = louder, richer tone`,
    examples: [
      {
        description: 'Piano to Forte crescendo',
        notation: 'p < f over 4 measures',
        audioDescription: 'Gradually increase bow speed and pressure',
      },
      {
        description: 'Subito forte',
        notation: 'p → sf',
        audioDescription: 'Sudden loud accent',
      },
    ],
    keyTakeaways: [
      'Dynamic range adds expression and interest',
      'Combine bow speed, pressure, and contact point',
      'Practice dynamic changes in long tones',
      'Even at pp, maintain a clear, beautiful tone',
    ],
    relatedTopics: ['articulation', 'rhythm'],
  },
  articulation: {
    id: 'lesson-articulation',
    topic: 'articulation',
    title: 'Articulation Techniques',
    content: `Articulation refers to how notes are started, sustained, and released. On violin, this involves bow strokes and left-hand techniques.

**Common Bow Strokes:**
- Détaché: Separate bow strokes, smooth connection
- Legato: Smooth, connected notes (often slurred)
- Staccato: Short, separated notes (dot above/below)
- Martelé: Accented, "hammered" strokes
- Spiccato: Bouncing bow, off the string
- Sautillé: Fast, controlled bouncing

**Slurs and Ties:**
- Slur: Multiple notes in one bow stroke
- Tie: Two notes of same pitch connected (held)

**Accents and Emphasis:**
- > (accent): Emphasis on that note
- ^ (marcato): Strong accent
- sf/sfz: Sudden forced accent`,
    examples: [
      {
        description: 'Legato phrase',
        notation: '4 notes under one slur',
        audioDescription: 'Smooth, connected, singing quality',
      },
      {
        description: 'Staccato passage',
        notation: 'Notes with dots, short and detached',
        audioDescription: 'Light, bouncy, separated',
      },
    ],
    keyTakeaways: [
      'Articulation brings character to music',
      'Start with détaché, then add other strokes',
      'Listen to recordings for articulation ideas',
      'Bow speed and contact point affect articulation',
    ],
    relatedTopics: ['dynamics', 'rhythm'],
  },
  chords: {
    id: 'lesson-chords',
    topic: 'chords',
    title: 'Understanding Chords',
    content: `Chords are three or more notes played together. While violin typically plays single melodic lines, understanding chords helps with harmony awareness and double stops.

**Basic Chord Types:**
- Major triad: Root + Major 3rd + Perfect 5th (happy sound)
- Minor triad: Root + Minor 3rd + Perfect 5th (sad sound)
- Diminished: Root + Minor 3rd + Diminished 5th (tense)
- Augmented: Root + Major 3rd + Augmented 5th (unstable)

**Chord Progressions:**
Common progressions include I-IV-V-I, which forms the backbone of much Western music.

**Double Stops on Violin:**
Playing two notes simultaneously:
- 3rds, 6ths, octaves are most common
- Requires careful finger placement
- Good for chord awareness training`,
    examples: [
      {
        description: 'C Major chord (C-E-G)',
        notation: 'C E G played as double stops',
        audioDescription: 'Bright, stable, resolved sound',
      },
      {
        description: 'A Minor chord (A-C-E)',
        notation: 'A C E',
        audioDescription: 'Darker, melancholic quality',
      },
    ],
    keyTakeaways: [
      'Major = happy, Minor = sad (simplified)',
      'Chord knowledge helps understand harmony',
      'Practice double stops for chord playing',
      'Listen for chord changes in accompaniments',
    ],
    relatedTopics: ['intervals', 'scales'],
  },
};

// Generate a contextual lesson based on current exercise
export const generateContextualLesson = (
  exercise: ExerciseMetadata
): TheoryLesson => {
  // Determine most relevant topic based on exercise
  const topic = determineTopicFromExercise(exercise);
  const baseLesson = THEORY_LESSONS[topic];
  
  // Add context about the current exercise
  const contextualContent = `
**Applying to Your Current Exercise:**
You're practicing "${exercise.title}" in ${exercise.key}. ${getExerciseSpecificTip(exercise, topic)}

${baseLesson.content}`;
  
  return {
    ...baseLesson,
    content: contextualContent,
  };
};

const determineTopicFromExercise = (exercise: ExerciseMetadata): TheoryTopic => {
  const focus = exercise.focus.toLowerCase();
  
  if (focus.includes('scale')) return 'scales';
  if (focus.includes('arpeggio')) return 'chords';
  if (focus.includes('rhythm')) return 'rhythm';
  if (focus.includes('bowing') || focus.includes('articulation')) return 'articulation';
  if (focus.includes('intonation')) return 'intervals';
  
  // Default based on key
  return 'keys';
};

const getExerciseSpecificTip = (exercise: ExerciseMetadata, topic: TheoryTopic): string => {
  const tips: Record<TheoryTopic, string> = {
    scales: `This ${exercise.key} exercise will help you internalize the finger pattern for this key.`,
    intervals: `Pay attention to the intervals between notes - this will improve your intonation.`,
    keys: `${exercise.key} has a specific set of sharps/flats - know them before playing.`,
    rhythm: `At ${exercise.tempo} BPM, focus on subdividing each beat evenly.`,
    dynamics: `Add dynamic variation to make this exercise more musical.`,
    articulation: `Try different articulations (legato, staccato) to vary your practice.`,
    chords: `Listen for the underlying chord progression as you play.`,
  };
  
  return tips[topic];
};

// Generate quiz questions
export const generateQuizQuestions = (topic: TheoryTopic, count: number = 10): TheoryQuiz[] => {
  const allQuizzes: Record<TheoryTopic, TheoryQuiz[]> = {
    scales: [
      {
        id: 'quiz-scales-1',
        topic: 'scales',
        question: 'What is the pattern of whole and half steps in a major scale?',
        options: ['W-W-H-W-W-W-H', 'W-H-W-W-H-W-W', 'H-W-W-H-W-W-W', 'W-W-W-H-W-W-H'],
        correctAnswer: 0,
        explanation: 'A major scale follows Whole-Whole-Half-Whole-Whole-Whole-Half.',
        difficulty: 1,
      },
      {
        id: 'quiz-scales-2',
        topic: 'scales',
        question: 'How many sharps are in the D Major scale?',
        options: ['1', '2', '3', '4'],
        correctAnswer: 1,
        explanation: 'D Major has 2 sharps: F# and C#.',
        difficulty: 1,
      },
      {
        id: 'quiz-scales-3',
        topic: 'scales',
        question: 'Which minor scale has a raised 7th degree?',
        options: ['Natural Minor', 'Harmonic Minor', 'Melodic Minor (descending)', 'Pentatonic Minor'],
        correctAnswer: 1,
        explanation: 'Harmonic minor has a raised 7th degree, creating an augmented 2nd between the 6th and 7th degrees.',
        difficulty: 2,
      },
      {
        id: 'quiz-scales-4',
        topic: 'scales',
        question: 'How many notes are in a pentatonic scale?',
        options: ['4', '5', '6', '7'],
        correctAnswer: 1,
        explanation: 'A pentatonic scale has 5 notes (penta = five in Greek).',
        difficulty: 1,
      },
      {
        id: 'quiz-scales-5',
        topic: 'scales',
        question: 'What is the pattern of a natural minor scale?',
        options: ['W-W-H-W-W-W-H', 'W-H-W-W-H-W-W', 'W-W-H-W-W-H-W', 'H-W-W-W-H-W-W'],
        correctAnswer: 1,
        explanation: 'Natural minor follows Whole-Half-Whole-Whole-Half-Whole-Whole.',
        difficulty: 2,
      },
      {
        id: 'quiz-scales-6',
        topic: 'scales',
        question: 'How many sharps are in the A Major scale?',
        options: ['1', '2', '3', '4'],
        correctAnswer: 2,
        explanation: 'A Major has 3 sharps: F#, C#, and G#.',
        difficulty: 1,
      },
      {
        id: 'quiz-scales-7',
        topic: 'scales',
        question: 'Which scale is commonly used in jazz and blues music?',
        options: ['Major scale', 'Natural minor scale', 'Blues scale', 'Harmonic minor scale'],
        correctAnswer: 2,
        explanation: 'The blues scale (a modified pentatonic with a "blue note") is fundamental to jazz and blues.',
        difficulty: 2,
      },
      {
        id: 'quiz-scales-8',
        topic: 'scales',
        question: 'What distinguishes the melodic minor scale from other minor scales?',
        options: ['It has no sharps or flats', 'It raises the 6th and 7th degrees ascending', 'It has a lowered 5th', 'It is the same as natural minor'],
        correctAnswer: 1,
        explanation: 'Melodic minor raises both the 6th and 7th degrees when ascending, then reverts to natural minor when descending.',
        difficulty: 3,
      },
      {
        id: 'quiz-scales-9',
        topic: 'scales',
        question: 'How many flats are in the F Major scale?',
        options: ['0', '1', '2', '3'],
        correctAnswer: 1,
        explanation: 'F Major has 1 flat: Bb.',
        difficulty: 1,
      },
      {
        id: 'quiz-scales-10',
        topic: 'scales',
        question: 'What is a chromatic scale?',
        options: ['A scale with only whole steps', 'A scale with all 12 half steps', 'A scale with 5 notes', 'A scale with no sharps or flats'],
        correctAnswer: 1,
        explanation: 'A chromatic scale includes all 12 half steps within an octave.',
        difficulty: 2,
      },
      {
        id: 'quiz-scales-11',
        topic: 'scales',
        question: 'Which scale degree is called the "leading tone"?',
        options: ['5th', '6th', '7th', '4th'],
        correctAnswer: 2,
        explanation: 'The 7th degree is called the leading tone because it "leads" back to the tonic (root).',
        difficulty: 2,
      },
      {
        id: 'quiz-scales-12',
        topic: 'scales',
        question: 'How many sharps are in the G Major scale?',
        options: ['0', '1', '2', '3'],
        correctAnswer: 1,
        explanation: 'G Major has 1 sharp: F#.',
        difficulty: 1,
      },
    ],
    intervals: [
      {
        id: 'quiz-intervals-1',
        topic: 'intervals',
        question: 'What interval is C to G?',
        options: ['Perfect Fourth', 'Perfect Fifth', 'Major Sixth', 'Minor Third'],
        correctAnswer: 1,
        explanation: 'C to G is a Perfect Fifth (C-D-E-F-G = 5 notes).',
        difficulty: 1,
      },
      {
        id: 'quiz-intervals-2',
        topic: 'intervals',
        question: 'Which interval is described as "dissonant" or "unstable"?',
        options: ['Perfect Fifth', 'Major Third', 'Tritone', 'Perfect Octave'],
        correctAnswer: 2,
        explanation: 'The tritone (augmented 4th/diminished 5th) is the most dissonant interval.',
        difficulty: 2,
      },
      {
        id: 'quiz-intervals-3',
        topic: 'intervals',
        question: 'How many half steps in a minor third?',
        options: ['2', '3', '4', '5'],
        correctAnswer: 1,
        explanation: 'A minor third contains 3 half steps (e.g., C to Eb).',
        difficulty: 2,
      },
      {
        id: 'quiz-intervals-4',
        topic: 'intervals',
        question: 'What interval is C to F?',
        options: ['Perfect Third', 'Perfect Fourth', 'Perfect Fifth', 'Major Fourth'],
        correctAnswer: 1,
        explanation: 'C to F is a Perfect Fourth (C-D-E-F = 4 notes).',
        difficulty: 1,
      },
      {
        id: 'quiz-intervals-5',
        topic: 'intervals',
        question: 'How many half steps are in a major second?',
        options: ['1', '2', '3', '4'],
        correctAnswer: 1,
        explanation: 'A major second contains 2 half steps (a whole step).',
        difficulty: 1,
      },
      {
        id: 'quiz-intervals-6',
        topic: 'intervals',
        question: 'What is the inversion of a Perfect Fifth?',
        options: ['Perfect Fourth', 'Perfect Fifth', 'Major Third', 'Minor Sixth'],
        correctAnswer: 0,
        explanation: 'The inversion of a Perfect Fifth is a Perfect Fourth. Intervals that add up to 9 are inversions.',
        difficulty: 3,
      },
      {
        id: 'quiz-intervals-7',
        topic: 'intervals',
        question: 'How many half steps are in an octave?',
        options: ['8', '10', '12', '14'],
        correctAnswer: 2,
        explanation: 'An octave contains 12 half steps.',
        difficulty: 1,
      },
      {
        id: 'quiz-intervals-8',
        topic: 'intervals',
        question: 'What song famously starts with a Perfect Fourth interval?',
        options: ['Twinkle Twinkle Little Star', 'Happy Birthday', 'Here Comes the Bride', 'Jaws Theme'],
        correctAnswer: 2,
        explanation: '"Here Comes the Bride" (Wedding March) opens with a Perfect Fourth.',
        difficulty: 2,
      },
      {
        id: 'quiz-intervals-9',
        topic: 'intervals',
        question: 'What interval is from C to E?',
        options: ['Minor Third', 'Major Third', 'Perfect Third', 'Augmented Third'],
        correctAnswer: 1,
        explanation: 'C to E is a Major Third (4 half steps).',
        difficulty: 1,
      },
      {
        id: 'quiz-intervals-10',
        topic: 'intervals',
        question: 'How many half steps are in a tritone?',
        options: ['5', '6', '7', '8'],
        correctAnswer: 1,
        explanation: 'A tritone contains 6 half steps (3 whole tones, hence "tri-tone").',
        difficulty: 2,
      },
      {
        id: 'quiz-intervals-11',
        topic: 'intervals',
        question: 'What is a unison?',
        options: ['Two different notes', 'The same note played together', 'Notes an octave apart', 'A chord of three notes'],
        correctAnswer: 1,
        explanation: 'A unison is when two voices play or sing the exact same pitch.',
        difficulty: 1,
      },
      {
        id: 'quiz-intervals-12',
        topic: 'intervals',
        question: 'Which interval is considered most consonant after the unison and octave?',
        options: ['Major Third', 'Perfect Fifth', 'Minor Second', 'Major Seventh'],
        correctAnswer: 1,
        explanation: 'The Perfect Fifth is considered the most consonant interval after unison and octave.',
        difficulty: 2,
      },
    ],
    keys: [
      {
        id: 'quiz-keys-1',
        topic: 'keys',
        question: 'Which key has no sharps or flats?',
        options: ['G Major', 'C Major', 'F Major', 'D Major'],
        correctAnswer: 1,
        explanation: 'C Major has no sharps or flats - all natural notes.',
        difficulty: 1,
      },
      {
        id: 'quiz-keys-2',
        topic: 'keys',
        question: 'What is the relative minor of G Major?',
        options: ['A minor', 'D minor', 'E minor', 'B minor'],
        correctAnswer: 2,
        explanation: 'E minor is the relative minor of G Major - they share the same key signature (F#).',
        difficulty: 2,
      },
      {
        id: 'quiz-keys-3',
        topic: 'keys',
        question: 'In the circle of fifths, moving clockwise adds:',
        options: ['Flats', 'Sharps', 'Natural notes', 'Nothing'],
        correctAnswer: 1,
        explanation: 'Moving clockwise around the circle of fifths adds sharps to the key signature.',
        difficulty: 1,
      },
      {
        id: 'quiz-keys-4',
        topic: 'keys',
        question: 'How many sharps does E Major have?',
        options: ['2', '3', '4', '5'],
        correctAnswer: 2,
        explanation: 'E Major has 4 sharps: F#, C#, G#, and D#.',
        difficulty: 2,
      },
      {
        id: 'quiz-keys-5',
        topic: 'keys',
        question: 'What is the relative major of A minor?',
        options: ['A Major', 'C Major', 'G Major', 'D Major'],
        correctAnswer: 1,
        explanation: 'C Major is the relative major of A minor - they share the same key signature (no sharps or flats).',
        difficulty: 1,
      },
      {
        id: 'quiz-keys-6',
        topic: 'keys',
        question: 'Which key has 5 flats?',
        options: ['Bb Major', 'Eb Major', 'Ab Major', 'Db Major'],
        correctAnswer: 3,
        explanation: 'Db Major has 5 flats: Bb, Eb, Ab, Db, and Gb.',
        difficulty: 3,
      },
      {
        id: 'quiz-keys-7',
        topic: 'keys',
        question: 'What is the order of sharps as they are added?',
        options: ['B E A D G C F', 'F C G D A E B', 'C G D A E B F', 'F B E A D G C'],
        correctAnswer: 1,
        explanation: 'Sharps are added in the order F C G D A E B (remember: Father Charles Goes Down And Ends Battle).',
        difficulty: 2,
      },
      {
        id: 'quiz-keys-8',
        topic: 'keys',
        question: 'How do you find the relative minor from a major key?',
        options: ['Go up a whole step', 'Go down a minor third', 'Go up a perfect fifth', 'Go down a half step'],
        correctAnswer: 1,
        explanation: 'The relative minor is found by going down a minor third (3 half steps) from the major key.',
        difficulty: 2,
      },
      {
        id: 'quiz-keys-9',
        topic: 'keys',
        question: 'Which key signature has F# and C#?',
        options: ['G Major', 'A Major', 'D Major', 'E Major'],
        correctAnswer: 2,
        explanation: 'D Major has exactly 2 sharps: F# and C#.',
        difficulty: 1,
      },
      {
        id: 'quiz-keys-10',
        topic: 'keys',
        question: 'What is the parallel minor of C Major?',
        options: ['A minor', 'C minor', 'G minor', 'E minor'],
        correctAnswer: 1,
        explanation: 'The parallel minor shares the same root note, so C Major\'s parallel minor is C minor.',
        difficulty: 2,
      },
      {
        id: 'quiz-keys-11',
        topic: 'keys',
        question: 'How many flats does Bb Major have?',
        options: ['1', '2', '3', '4'],
        correctAnswer: 1,
        explanation: 'Bb Major has 2 flats: Bb and Eb.',
        difficulty: 1,
      },
      {
        id: 'quiz-keys-12',
        topic: 'keys',
        question: 'What is the enharmonic equivalent of F# Major?',
        options: ['E Major', 'G Major', 'Gb Major', 'Ab Major'],
        correctAnswer: 2,
        explanation: 'F# Major and Gb Major are enharmonic equivalents - they sound the same but are written differently.',
        difficulty: 3,
      },
    ],
    rhythm: [
      {
        id: 'quiz-rhythm-1',
        topic: 'rhythm',
        question: 'How many beats does a dotted half note get in 4/4 time?',
        options: ['2', '3', '4', '1.5'],
        correctAnswer: 1,
        explanation: 'A dotted half note = half note (2 beats) + dot (1 beat) = 3 beats.',
        difficulty: 1,
      },
      {
        id: 'quiz-rhythm-2',
        topic: 'rhythm',
        question: 'What time signature is often called "waltz time"?',
        options: ['4/4', '3/4', '6/8', '2/4'],
        correctAnswer: 1,
        explanation: '3/4 time (three quarter notes per measure) is called waltz time.',
        difficulty: 1,
      },
      {
        id: 'quiz-rhythm-3',
        topic: 'rhythm',
        question: 'How many sixteenth notes equal one quarter note?',
        options: ['2', '3', '4', '8'],
        correctAnswer: 2,
        explanation: 'Four sixteenth notes equal one quarter note.',
        difficulty: 1,
      },
      {
        id: 'quiz-rhythm-4',
        topic: 'rhythm',
        question: 'What does a dot after a note do?',
        options: ['Doubles the note value', 'Adds half the note value', 'Makes the note staccato', 'Reduces the note value'],
        correctAnswer: 1,
        explanation: 'A dot adds half the value of the note it follows.',
        difficulty: 1,
      },
      {
        id: 'quiz-rhythm-5',
        topic: 'rhythm',
        question: 'In 6/8 time, how many eighth notes are in a measure?',
        options: ['4', '6', '8', '3'],
        correctAnswer: 1,
        explanation: '6/8 time has 6 eighth notes per measure.',
        difficulty: 1,
      },
      {
        id: 'quiz-rhythm-6',
        topic: 'rhythm',
        question: 'What is a triplet?',
        options: ['Three notes played in the time of two', 'A chord with three notes', 'Three measures', 'A type of rest'],
        correctAnswer: 0,
        explanation: 'A triplet divides a beat into three equal parts instead of two.',
        difficulty: 2,
      },
      {
        id: 'quiz-rhythm-7',
        topic: 'rhythm',
        question: 'What is the difference between 4/4 and 2/2 (cut time)?',
        options: ['They are completely different', 'Same number of beats but different feel', '2/2 is faster', '4/4 has more notes'],
        correctAnswer: 1,
        explanation: 'Both have the same duration per measure, but 2/2 feels like 2 beats per measure instead of 4.',
        difficulty: 3,
      },
      {
        id: 'quiz-rhythm-8',
        topic: 'rhythm',
        question: 'How many beats does a whole note get in 4/4 time?',
        options: ['1', '2', '3', '4'],
        correctAnswer: 3,
        explanation: 'A whole note gets 4 beats in 4/4 time, filling the entire measure.',
        difficulty: 1,
      },
      {
        id: 'quiz-rhythm-9',
        topic: 'rhythm',
        question: 'What is syncopation?',
        options: ['Playing notes loudly', 'Emphasis on weak beats or off-beats', 'Playing in unison', 'Slowing down'],
        correctAnswer: 1,
        explanation: 'Syncopation places emphasis on normally weak beats or between beats, creating rhythmic interest.',
        difficulty: 2,
      },
      {
        id: 'quiz-rhythm-10',
        topic: 'rhythm',
        question: 'What does "alla breve" mean?',
        options: ['Very fast', 'Cut time (2/2)', 'Very slow', 'In 3/4 time'],
        correctAnswer: 1,
        explanation: 'Alla breve means cut time (2/2), where the half note gets one beat.',
        difficulty: 3,
      },
      {
        id: 'quiz-rhythm-11',
        topic: 'rhythm',
        question: 'How many eighth notes equal a whole note?',
        options: ['4', '6', '8', '16'],
        correctAnswer: 2,
        explanation: 'Eight eighth notes equal one whole note.',
        difficulty: 1,
      },
      {
        id: 'quiz-rhythm-12',
        topic: 'rhythm',
        question: 'What is a fermata?',
        options: ['A type of rest', 'Hold the note longer than its value', 'Play the note short', 'Repeat the section'],
        correctAnswer: 1,
        explanation: 'A fermata (bird\'s eye) indicates holding a note longer than its written value, at the performer\'s discretion.',
        difficulty: 2,
      },
    ],
    dynamics: [
      {
        id: 'quiz-dynamics-1',
        topic: 'dynamics',
        question: 'What does "mezzo forte" (mf) mean?',
        options: ['Very loud', 'Medium soft', 'Medium loud', 'Very soft'],
        correctAnswer: 2,
        explanation: 'Mezzo forte means medium loud - between piano and forte.',
        difficulty: 1,
      },
      {
        id: 'quiz-dynamics-2',
        topic: 'dynamics',
        question: 'What is a crescendo?',
        options: ['Gradually getting softer', 'Gradually getting louder', 'Sudden loud note', 'Sustained note'],
        correctAnswer: 1,
        explanation: 'A crescendo indicates gradually increasing volume.',
        difficulty: 1,
      },
      {
        id: 'quiz-dynamics-3',
        topic: 'dynamics',
        question: 'Which dynamic marking is the softest?',
        options: ['pp', 'p', 'mp', 'ppp'],
        correctAnswer: 3,
        explanation: 'ppp (pianississimo) is the softest - more ps = softer.',
        difficulty: 1,
      },
      {
        id: 'quiz-dynamics-4',
        topic: 'dynamics',
        question: 'What does "sforzando" (sfz) mean?',
        options: ['Very soft', 'Gradually louder', 'Sudden strong accent', 'Medium loud'],
        correctAnswer: 2,
        explanation: 'Sforzando means a sudden, strong accent on a note.',
        difficulty: 2,
      },
      {
        id: 'quiz-dynamics-5',
        topic: 'dynamics',
        question: 'What is a diminuendo?',
        options: ['Getting louder', 'Getting softer', 'Staying the same', 'Getting faster'],
        correctAnswer: 1,
        explanation: 'Diminuendo (or decrescendo) means gradually getting softer.',
        difficulty: 1,
      },
      {
        id: 'quiz-dynamics-6',
        topic: 'dynamics',
        question: 'What does "fortissimo" (ff) mean?',
        options: ['Soft', 'Medium loud', 'Very loud', 'Very soft'],
        correctAnswer: 2,
        explanation: 'Fortissimo means very loud.',
        difficulty: 1,
      },
      {
        id: 'quiz-dynamics-7',
        topic: 'dynamics',
        question: 'On violin, which bow element primarily affects dynamics?',
        options: ['Bow hair tension only', 'Bow speed and pressure', 'Finger placement only', 'String choice only'],
        correctAnswer: 1,
        explanation: 'Bow speed and pressure are the primary factors affecting dynamics on violin, along with contact point.',
        difficulty: 2,
      },
      {
        id: 'quiz-dynamics-8',
        topic: 'dynamics',
        question: 'What does "subito piano" mean?',
        options: ['Gradually soft', 'Suddenly soft', 'Very soft', 'Medium soft'],
        correctAnswer: 1,
        explanation: 'Subito means "suddenly," so subito piano means an immediate change to soft.',
        difficulty: 2,
      },
      {
        id: 'quiz-dynamics-9',
        topic: 'dynamics',
        question: 'Which dynamic is louder: forte or mezzo forte?',
        options: ['Mezzo forte', 'Forte', 'They are the same', 'Neither'],
        correctAnswer: 1,
        explanation: 'Forte (f) is louder than mezzo forte (mf). Mezzo means medium.',
        difficulty: 1,
      },
      {
        id: 'quiz-dynamics-10',
        topic: 'dynamics',
        question: 'What does "fp" mean?',
        options: ['Very loud', 'Loud then immediately soft', 'Soft then loud', 'Medium'],
        correctAnswer: 1,
        explanation: 'fp (forte-piano) means play loud, then immediately soft.',
        difficulty: 2,
      },
      {
        id: 'quiz-dynamics-11',
        topic: 'dynamics',
        question: 'Where should the bow contact the string for louder sound on violin?',
        options: ['Closer to the fingerboard', 'Closer to the bridge', 'At the tip only', 'It doesn\'t matter'],
        correctAnswer: 1,
        explanation: 'Playing closer to the bridge produces a louder, more brilliant tone.',
        difficulty: 2,
      },
      {
        id: 'quiz-dynamics-12',
        topic: 'dynamics',
        question: 'What is the Italian word for "loud"?',
        options: ['Piano', 'Forte', 'Mezzo', 'Crescendo'],
        correctAnswer: 1,
        explanation: 'Forte is the Italian word for loud or strong.',
        difficulty: 1,
      },
    ],
    articulation: [
      {
        id: 'quiz-articulation-1',
        topic: 'articulation',
        question: 'What does a dot above a note indicate?',
        options: ['Play louder', 'Hold longer', 'Play short (staccato)', 'Play faster'],
        correctAnswer: 2,
        explanation: 'A dot above/below a note indicates staccato - short, detached.',
        difficulty: 1,
      },
      {
        id: 'quiz-articulation-2',
        topic: 'articulation',
        question: 'What bow stroke uses bouncing off the string?',
        options: ['Legato', 'Détaché', 'Spiccato', 'Martelé'],
        correctAnswer: 2,
        explanation: 'Spiccato is a bouncing bow stroke where the bow leaves the string.',
        difficulty: 2,
      },
      {
        id: 'quiz-articulation-3',
        topic: 'articulation',
        question: 'What does a slur indicate?',
        options: ['Play notes short', 'Play notes in one bow stroke', 'Play notes loud', 'Play notes fast'],
        correctAnswer: 1,
        explanation: 'A slur indicates playing multiple notes in one bow stroke (legato).',
        difficulty: 1,
      },
      {
        id: 'quiz-articulation-4',
        topic: 'articulation',
        question: 'What is détaché?',
        options: ['Notes connected by a slur', 'Separate bow strokes with smooth connection', 'Very short, bouncy notes', 'Accented notes'],
        correctAnswer: 1,
        explanation: 'Détaché uses separate bow strokes for each note, but the sound remains smooth and connected.',
        difficulty: 2,
      },
      {
        id: 'quiz-articulation-5',
        topic: 'articulation',
        question: 'What does an accent mark (>) above a note mean?',
        options: ['Play softer', 'Play with emphasis', 'Hold the note', 'Play short'],
        correctAnswer: 1,
        explanation: 'An accent mark indicates the note should be played with extra emphasis or attack.',
        difficulty: 1,
      },
      {
        id: 'quiz-articulation-6',
        topic: 'articulation',
        question: 'What is martelé?',
        options: ['Smooth, connected bowing', 'Hammered, accented strokes', 'Bouncing bow', 'Tremolo'],
        correctAnswer: 1,
        explanation: 'Martelé is a "hammered" bow stroke with a strong, accented attack.',
        difficulty: 2,
      },
      {
        id: 'quiz-articulation-7',
        topic: 'articulation',
        question: 'What is the difference between a tie and a slur?',
        options: ['They are the same', 'Tie connects same pitches, slur connects different pitches', 'Slur is longer', 'Tie is for winds only'],
        correctAnswer: 1,
        explanation: 'A tie connects notes of the same pitch (held together), while a slur connects different pitches in one bow.',
        difficulty: 2,
      },
      {
        id: 'quiz-articulation-8',
        topic: 'articulation',
        question: 'What is sautillé?',
        options: ['A slow, sustained stroke', 'Fast, controlled bouncing of the bow', 'A type of pizzicato', 'Playing harmonics'],
        correctAnswer: 1,
        explanation: 'Sautillé is a fast, light bouncing stroke that happens naturally at higher speeds.',
        difficulty: 3,
      },
      {
        id: 'quiz-articulation-9',
        topic: 'articulation',
        question: 'What does "legato" mean?',
        options: ['Short and detached', 'Smooth and connected', 'Loud and accented', 'Fast'],
        correctAnswer: 1,
        explanation: 'Legato means smooth and connected, with no gaps between notes.',
        difficulty: 1,
      },
      {
        id: 'quiz-articulation-10',
        topic: 'articulation',
        question: 'What is a down-bow?',
        options: ['Bow moving from tip to frog', 'Bow moving from frog to tip', 'Pressing down harder', 'Playing pizzicato'],
        correctAnswer: 1,
        explanation: 'A down-bow moves from the frog (near your hand) to the tip of the bow.',
        difficulty: 1,
      },
      {
        id: 'quiz-articulation-11',
        topic: 'articulation',
        question: 'What is col legno?',
        options: ['Playing with the bow hair', 'Playing with the wood of the bow', 'Playing pizzicato', 'Playing harmonics'],
        correctAnswer: 1,
        explanation: 'Col legno means playing with the wooden stick of the bow instead of the hair.',
        difficulty: 3,
      },
      {
        id: 'quiz-articulation-12',
        topic: 'articulation',
        question: 'What does tenuto (horizontal line above a note) indicate?',
        options: ['Play short', 'Hold for full value with slight emphasis', 'Play very loud', 'Play faster'],
        correctAnswer: 1,
        explanation: 'Tenuto indicates holding the note for its full value with a slight emphasis, but not accented.',
        difficulty: 2,
      },
    ],
    chords: [
      {
        id: 'quiz-chords-1',
        topic: 'chords',
        question: 'What three notes make up a C Major chord?',
        options: ['C-D-E', 'C-E-G', 'C-F-A', 'C-Eb-G'],
        correctAnswer: 1,
        explanation: 'C Major = C (root) + E (major 3rd) + G (perfect 5th).',
        difficulty: 1,
      },
      {
        id: 'quiz-chords-2',
        topic: 'chords',
        question: 'What makes a minor chord different from a major chord?',
        options: ['Lower root', 'Lowered 3rd', 'Lowered 5th', 'Higher root'],
        correctAnswer: 1,
        explanation: 'A minor chord has a lowered (minor) 3rd compared to major.',
        difficulty: 1,
      },
      {
        id: 'quiz-chords-3',
        topic: 'chords',
        question: 'What is a triad?',
        options: ['Two notes', 'Three notes stacked in thirds', 'Four notes', 'A scale'],
        correctAnswer: 1,
        explanation: 'A triad is a three-note chord built by stacking thirds.',
        difficulty: 1,
      },
      {
        id: 'quiz-chords-4',
        topic: 'chords',
        question: 'What notes make up a G Major chord?',
        options: ['G-A-B', 'G-Bb-D', 'G-B-D', 'G-C-E'],
        correctAnswer: 2,
        explanation: 'G Major = G (root) + B (major 3rd) + D (perfect 5th).',
        difficulty: 1,
      },
      {
        id: 'quiz-chords-5',
        topic: 'chords',
        question: 'What is a diminished chord?',
        options: ['Root + major 3rd + perfect 5th', 'Root + minor 3rd + perfect 5th', 'Root + minor 3rd + diminished 5th', 'Root + major 3rd + augmented 5th'],
        correctAnswer: 2,
        explanation: 'A diminished chord has a minor 3rd and a diminished (lowered) 5th.',
        difficulty: 2,
      },
      {
        id: 'quiz-chords-6',
        topic: 'chords',
        question: 'What is a seventh chord?',
        options: ['A chord played on the 7th beat', 'A triad with an added 7th', 'A chord with seven notes', 'A chord in 7/8 time'],
        correctAnswer: 1,
        explanation: 'A seventh chord is a triad with an added note a seventh above the root.',
        difficulty: 2,
      },
      {
        id: 'quiz-chords-7',
        topic: 'chords',
        question: 'What is a chord inversion?',
        options: ['Playing the chord backwards', 'Changing which note is in the bass', 'Playing the chord quieter', 'Making major into minor'],
        correctAnswer: 1,
        explanation: 'An inversion changes which note of the chord is the lowest (bass) note.',
        difficulty: 2,
      },
      {
        id: 'quiz-chords-8',
        topic: 'chords',
        question: 'What is a double stop on violin?',
        options: ['Stopping the bow twice', 'Playing two notes simultaneously', 'Using two fingers on one string', 'Stopping mid-phrase'],
        correctAnswer: 1,
        explanation: 'A double stop is playing two notes at the same time on adjacent strings.',
        difficulty: 1,
      },
      {
        id: 'quiz-chords-9',
        topic: 'chords',
        question: 'What is the most common double stop interval for beginners?',
        options: ['Seconds', 'Thirds and sixths', 'Sevenths', 'Tritones'],
        correctAnswer: 1,
        explanation: 'Thirds and sixths are the most common and comfortable double stop intervals for beginners.',
        difficulty: 2,
      },
      {
        id: 'quiz-chords-10',
        topic: 'chords',
        question: 'What chord progression is I-IV-V-I?',
        options: ['A minor progression', 'The most common major progression', 'A jazz progression', 'A modal progression'],
        correctAnswer: 1,
        explanation: 'I-IV-V-I is the most fundamental chord progression in Western music.',
        difficulty: 2,
      },
      {
        id: 'quiz-chords-11',
        topic: 'chords',
        question: 'What is an augmented chord?',
        options: ['Root + minor 3rd + perfect 5th', 'Root + major 3rd + perfect 5th', 'Root + major 3rd + augmented 5th', 'Root + minor 3rd + diminished 5th'],
        correctAnswer: 2,
        explanation: 'An augmented chord has a major 3rd and a raised (augmented) 5th.',
        difficulty: 2,
      },
      {
        id: 'quiz-chords-12',
        topic: 'chords',
        question: 'In Roman numeral analysis, what does a lowercase numeral indicate?',
        options: ['A major chord', 'A minor chord', 'A loud chord', 'An inverted chord'],
        correctAnswer: 1,
        explanation: 'Lowercase Roman numerals (i, ii, iv) indicate minor chords; uppercase (I, IV, V) indicate major chords.',
        difficulty: 2,
      },
    ],
  };
  
  const topicQuizzes = allQuizzes[topic] || [];
  // Shuffle and return requested count
  return topicQuizzes
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(count, topicQuizzes.length));
};

// Get all available topics
export const getAvailableTopics = (): TheoryTopic[] => {
  return Object.keys(THEORY_LESSONS) as TheoryTopic[];
};
