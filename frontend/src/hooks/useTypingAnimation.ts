import { useState, useEffect } from 'react';

interface TypingAnimationOptions {
  typingSpeed?: number;
  startDelay?: number;
}

interface TypingAnimationResult {
  displayedText: string;
  isComplete: boolean;
}

export function useTypingAnimation(
  text: string,
  { typingSpeed = 50, startDelay = 0 }: TypingAnimationOptions = {}
): TypingAnimationResult {
  const [charIndex, setCharIndex] = useState(0);
  const [prevText, setPrevText] = useState(text);

  // Reset when text prop changes
  if (text !== prevText) {
    setPrevText(text);
    setCharIndex(0);
  }

  // Handle typing animation
  useEffect(() => {
    // Skip if empty or complete
    if (!text || charIndex >= text.length) {
      return;
    }

    // StartDelay for first char, typingSpeed for rest
    const delay = charIndex === 0 ? startDelay : typingSpeed;

    const timer = setTimeout(() => {
      setCharIndex((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, charIndex, typingSpeed, startDelay]);

  const displayedText = text.slice(0, charIndex);
  const isComplete = !text || charIndex >= text.length;

  return { displayedText, isComplete };
}
