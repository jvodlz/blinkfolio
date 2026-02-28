import { useState, useEffect } from 'react';
import { useTypingAnimation } from '../hooks/useTypingAnimation';
import './WelcomePage.css';

export function WelcomePage() {
  const [currentPhase, setCurrentPhase] = useState<'first' | 'second'>('first');

  const greetingMessage = useTypingAnimation('Hello, my name is James', {
    typingSpeed: 80,
    startDelay: 500,
  });

  const welcomeMessage = useTypingAnimation(
    currentPhase === 'second' ? 'Welcome to one of my creative spaces' : '',
    {
      typingSpeed: 80,
      startDelay: 300,
    }
  );

  useEffect(() => {
    if (greetingMessage.isComplete && currentPhase === 'first') {
      const timeout = setTimeout(() => {
        setCurrentPhase('second');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [greetingMessage.isComplete, currentPhase]);

  return (
    <div className="welcome-page">
      <div className="typing-container">
        {currentPhase === 'first' && (
          <h1 className="typing-text fade-in">
            {greetingMessage.displayedText}
          </h1>
        )}

        {currentPhase === 'second' && (
          <h1 className="typing-text fade-in">
            {welcomeMessage.displayedText}
          </h1>
        )}
      </div>

      {welcomeMessage.isComplete && (
        <div className="navigation-hint fade-in">
          <p>Press any key to continue...</p>
        </div>
      )}
    </div>
  );
}
