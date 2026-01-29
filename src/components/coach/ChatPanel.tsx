'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Send, 
  X, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  Loader2,
  Sparkles,
  HelpCircle,
  Heart,
  Music,
  Lightbulb
} from 'lucide-react';
import { useCoachStore, buildCoachContext } from '@/stores/coach-store';
import { QUICK_ACTIONS, type QuickActionKey } from '@/lib/ai/practice-coach-agent';
import { FEATURES, EVENTS, trackEvent } from '@/lib/analytics/tracking';
import type { ChatMessage, CoachContext, Exercise, PerformanceAnalysis } from '@/types';

interface ChatPanelProps {
  difficulty: number;
  currentExercise: Exercise | null;
  currentAnalysis: PerformanceAnalysis | null;
  performanceHistory: PerformanceAnalysis[];
}

const QuickActionButton = ({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className="gap-1.5 text-xs h-8"
    aria-label={label}
  >
    <Icon className="h-3 w-3" />
    {label}
  </Button>
);

// Format time consistently to avoid hydration mismatch
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

const ChatMessageItem = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block p-3 rounded-lg ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
};

export const ChatPanel = ({
  difficulty,
  currentExercise,
  currentAnalysis,
  performanceHistory,
}: ChatPanelProps) => {
  const {
    messages,
    isLoading,
    error,
    isOpen,
    setIsOpen,
    toggleOpen,
    addMessage,
    updateLastAssistantMessage,
    setIsLoading,
    setError,
    clearMessages,
    clearError,
  } = useCoachStore();

  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Ensure component is mounted before rendering persisted data
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Build context from current session state
  const buildContext = useCallback((): CoachContext => {
    return buildCoachContext(
      difficulty,
      currentExercise,
      currentAnalysis,
      performanceHistory
    );
  }, [difficulty, currentExercise, currentAnalysis, performanceHistory]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    
    // Add user message
    addMessage({ role: 'user', content: content.trim() });
    setInputValue('');
    setIsLoading(true);

    // Add placeholder for assistant response
    addMessage({ role: 'assistant', content: '' });

    try {
      const context = buildContext();
      
      const response = await fetch('/api/practice-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          context,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Check if it's a streaming response
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/plain')) {
        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          updateLastAssistantMessage(fullContent);
        }
      } else {
        // Handle JSON response (fallback)
        const data = await response.json();
        updateLastAssistantMessage(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove the empty assistant message placeholder
      updateLastAssistantMessage('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading, 
    messages, 
    buildContext, 
    addMessage, 
    updateLastAssistantMessage, 
    setIsLoading, 
    setError
  ]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      // Track message sent
      trackEvent(EVENTS.COACH_MESSAGE_SENT, FEATURES.COACH, {
        type: 'user_message',
      });
      sendMessage(inputValue);
    }
  }, [inputValue, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        // Track message sent
        trackEvent(EVENTS.COACH_MESSAGE_SENT, FEATURES.COACH, {
          type: 'user_message',
        });
        sendMessage(inputValue);
      }
    }
  }, [inputValue, sendMessage]);

  const handleQuickAction = useCallback((action: QuickActionKey) => {
    // Track quick action
    trackEvent(EVENTS.COACH_QUICK_ACTION, FEATURES.COACH, {
      action,
    });
    sendMessage(QUICK_ACTIONS[action]);
  }, [sendMessage]);

  // Don't render until mounted to avoid hydration mismatch with persisted store
  if (!isMounted) {
    return null;
  }

  if (!isOpen) {
    return (
      <Button
        variant="default"
        size="lg"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 gap-2 shadow-lg z-50"
        aria-label="Open practice coach chat"
      >
        <MessageCircle className="h-5 w-5" />
        Coach
        {messages.length > 0 && (
          <Badge variant="secondary" className="ml-1">
            {messages.length}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 max-h-[600px] shadow-xl z-50 flex flex-col">
      <CardHeader className="py-3 flex-shrink-0">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span>Practice Coach</span>
            <Badge variant="outline" className="text-xs">AI</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
              aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <Sparkles className="h-10 w-10 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Hi! I'm your Practice Coach</p>
                    <p className="text-sm text-muted-foreground">
                      Ask me anything about violin technique, practice strategies, or music theory.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessageItem key={msg.id} message={msg} />
                ))
              )}
              {isLoading && messages[messages.length - 1]?.content === '' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Quick Actions */}
          <div className="px-4 py-2 space-y-2">
            <p className="text-xs text-muted-foreground">Quick actions:</p>
            <div className="flex flex-wrap gap-1.5">
              <QuickActionButton
                icon={HelpCircle}
                label="Help"
                onClick={() => handleQuickAction('help_passage')}
                disabled={isLoading}
              />
              <QuickActionButton
                icon={Music}
                label="Technique"
                onClick={() => handleQuickAction('explain_technique')}
                disabled={isLoading}
              />
              <QuickActionButton
                icon={Heart}
                label="Motivate"
                onClick={() => handleQuickAction('motivate')}
                disabled={isLoading}
              />
              <QuickActionButton
                icon={Lightbulb}
                label="Tips"
                onClick={() => handleQuickAction('practice_tips')}
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator />

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-4 space-y-2">
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your coach..."
                disabled={isLoading}
                className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                rows={1}
                aria-label="Chat message input"
              />
              <div className="flex flex-col gap-1">
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputValue.trim() || isLoading}
                  className="h-10 w-10"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
                {messages.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearMessages}
                    className="h-8 w-8"
                    aria-label="Clear chat history"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
};
