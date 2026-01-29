import type { ChatMessage, CoachContext } from '@/types';

const SYSTEM_PROMPT = `You are an expert, supportive violin teacher named Coach. Your role is to:

1. Provide helpful, specific advice about violin technique, practice strategies, and music theory
2. Be encouraging and supportive while also being honest about areas for improvement
3. Consider the student's current level and recent performance when giving advice
4. Keep responses concise but informative (2-4 sentences when possible)
5. Offer practical exercises and tips that can be immediately applied
6. Explain musical concepts in a clear, accessible way

Personality traits:
- Warm and encouraging
- Patient and understanding
- Knowledgeable but not condescending
- Focused on building confidence while promoting growth

When the student asks about their current exercise or performance:
- Reference specific details from their context
- Connect feedback to actionable improvements
- Celebrate small wins while identifying next steps

Remember: You're helping someone learn a beautiful instrument. Make the journey enjoyable!`;

export const generateCoachSystemPrompt = (context: CoachContext): string => {
  let contextInfo = SYSTEM_PROMPT + '\n\n--- CURRENT CONTEXT ---\n';
  
  contextInfo += `Student Level: ${context.userLevel}/10\n`;
  
  if (context.currentExercise) {
    contextInfo += `\nCurrent Exercise:\n`;
    contextInfo += `- Title: ${context.currentExercise.title}\n`;
    contextInfo += `- Key: ${context.currentExercise.key}\n`;
    contextInfo += `- Tempo: ${context.currentExercise.tempo} BPM\n`;
    contextInfo += `- Focus: ${context.currentExercise.focus}\n`;
    contextInfo += `- Difficulty: ${context.currentExercise.difficulty}/10\n`;
    if (context.currentExercise.techniques?.length) {
      contextInfo += `- Techniques: ${context.currentExercise.techniques.join(', ')}\n`;
    }
  }
  
  if (context.recentPerformance) {
    contextInfo += `\nMost Recent Performance:\n`;
    contextInfo += `- Overall Score: ${context.recentPerformance.overallScore}/100\n`;
    contextInfo += `- Pitch Accuracy: ${context.recentPerformance.pitch.accuracy}%\n`;
    contextInfo += `- Rhythm Accuracy: ${context.recentPerformance.rhythm.accuracy}%\n`;
    contextInfo += `- Next Focus Area: ${context.recentPerformance.nextFocus}\n`;
    
    if (context.recentPerformance.pitch.suggestions?.length) {
      contextInfo += `- Pitch Suggestions: ${context.recentPerformance.pitch.suggestions.join('; ')}\n`;
    }
    if (context.recentPerformance.rhythm.suggestions?.length) {
      contextInfo += `- Rhythm Suggestions: ${context.recentPerformance.rhythm.suggestions.join('; ')}\n`;
    }
  }
  
  if (context.practiceHistory?.length) {
    contextInfo += `\nRecent Practice Summary:\n`;
    context.practiceHistory.forEach((item) => {
      contextInfo += `- ${item.focus}: avg ${item.avgScore}%\n`;
    });
  }
  
  return contextInfo;
};

export const formatConversationForAPI = (
  messages: ChatMessage[],
  context: CoachContext
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> => {
  const systemPrompt = generateCoachSystemPrompt(context);
  
  const formattedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];
  
  // Add conversation history (limit to last 10 messages for context window)
  const recentMessages = messages.slice(-10);
  recentMessages.forEach((msg) => {
    formattedMessages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  });
  
  return formattedMessages;
};

// Quick action prompts
export const QUICK_ACTIONS = {
  help_passage: "I'm having trouble with this passage. Can you help me understand how to approach it?",
  explain_technique: "Can you explain the technique I should be using for this exercise?",
  motivate: "I'm feeling a bit stuck. Can you give me some encouragement and tips to keep going?",
  warm_up: "What's a good warm-up routine before I start practicing?",
  practice_tips: "Do you have any practice tips for improving faster?",
  theory_help: "Can you explain the music theory behind what I'm practicing?",
} as const;

export type QuickActionKey = keyof typeof QUICK_ACTIONS;

// Fallback responses when API is unavailable
export const generateLocalCoachResponse = (
  message: string,
  context: CoachContext
): string => {
  const lowerMessage = message.toLowerCase();
  
  // Check for common topics and provide relevant responses
  if (lowerMessage.includes('help') && lowerMessage.includes('passage')) {
    return `For challenging passages, try breaking them into smaller sections. Practice each section slowly, then gradually increase speed. Focus on the transitions between notes - that's often where issues occur. ${context.currentExercise ? `For your ${context.currentExercise.key} ${context.currentExercise.focus} exercise, pay special attention to finger placement.` : ''}`;
  }
  
  if (lowerMessage.includes('technique')) {
    const focus = context.currentExercise?.focus || 'general';
    const techniques: Record<string, string> = {
      scales: 'For scales, keep your fingers curved and close to the fingerboard. Think about smooth weight transfer between fingers.',
      arpeggios: 'For arpeggios, maintain a relaxed hand position and practice shifting smoothly between positions.',
      bowing: 'For bowing exercises, focus on even bow pressure and straight bow movement parallel to the bridge.',
      intonation: 'For intonation, use your ear as the primary guide. Practice with drones or tuners to develop pitch awareness.',
      rhythm: 'For rhythm, internalize the beat before playing. Try tapping or clapping the rhythm first.',
      mixed: 'Focus on connecting all the elements - clean technique allows for better musical expression.',
    };
    return techniques[focus] || techniques.mixed;
  }
  
  if (lowerMessage.includes('motivat') || lowerMessage.includes('stuck') || lowerMessage.includes('encourag')) {
    const score = context.recentPerformance?.overallScore;
    if (score && score >= 70) {
      return `You're making great progress! Your recent score of ${score}% shows real improvement. Remember, even professional musicians practice daily - consistency is key. Take a short break if needed, then come back refreshed.`;
    }
    return "Every expert was once a beginner. The fact that you're practicing shows dedication. Focus on small improvements each day - they compound over time. You've got this!";
  }
  
  if (lowerMessage.includes('warm') && lowerMessage.includes('up')) {
    return "A good warm-up routine: 1) Start with open strings to check bow control, 2) Play a simple scale slowly, focusing on intonation, 3) Do some bow exercises (whole bows, string crossings), 4) Gradually increase tempo. This prepares both your hands and your ear.";
  }
  
  if (lowerMessage.includes('practice') && lowerMessage.includes('tip')) {
    return "Key practice tips: 1) Practice slowly - speed comes from accuracy, 2) Focus on problem spots rather than playing through entire pieces, 3) Use a metronome for rhythm, 4) Record yourself and listen back, 5) Take breaks every 25-30 minutes. Quality practice beats quantity!";
  }
  
  if (lowerMessage.includes('theory')) {
    const key = context.currentExercise?.key;
    if (key) {
      return `You're practicing in ${key}. Understanding the key signature helps you anticipate accidentals and finger patterns. Each key has a unique character - ${key} is often described as having a particular emotional quality. Try listening to pieces in this key to internalize its sound.`;
    }
    return "Music theory provides the framework for understanding what you play. Start with scales (the building blocks), then explore how chords are built from them. This knowledge helps with sight-reading and memorization.";
  }
  
  // Default helpful response
  return `I'm here to help with your violin practice! ${context.currentExercise ? `You're currently working on a ${context.currentExercise.focus} exercise in ${context.currentExercise.key}. ` : ''}Feel free to ask about technique, practice strategies, music theory, or anything else related to your learning journey.`;
};
