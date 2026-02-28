import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTypingAnimation } from './useTypingAnimation';

describe('useTypingAnimation', () => {
  it('should start with empty displayedText', () => {
    const { result } = renderHook(() =>
      useTypingAnimation('Hello', { typingSpeed: 50, startDelay: 0 })
    );

    expect(result.current.displayedText).toBe('');
    expect(result.current.isComplete).toBe(false);
  });

  it('should handle empty string', () => {
    const { result } = renderHook(() =>
      useTypingAnimation('', { typingSpeed: 50 })
    );

    expect(result.current.displayedText).toBe('');
    expect(result.current.isComplete).toBe(true);
  });
});
