import { useState, useEffect, useCallback } from 'react';
import { useTypingAnimation } from '../hooks/useTypingAnimation';
import { Game } from '../game/Game';
import { WelcomeScene } from '../game/scenes/WelcomeScene';
import { useNavigate } from 'react-router-dom';
import './WelcomePage.css';

export function WelcomePage() {
  const [messageIndex, setMessageIndex] = useState(0);
  const navigate = useNavigate();

  const messages = [
    'Hello, my name is James',
    'Welcome to one of my creative spaces',
  ];

  const currentMessage = useTypingAnimation(messages[messageIndex], {
    typingSpeed: 80,
    startDelay: messageIndex === 0 ? 500 : 300,
  });

  // Loop messages
  useEffect(() => {
    if (currentMessage.isComplete) {
      const timeout = setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [currentMessage.isComplete, messages.length]);

  const handleNavigate = useCallback(() => {
    navigate('/main');
  }, [navigate]);

  return (
    <div className={`welcome-page main-palette`}>
      {/* Game layer. Renders once, stays mounted */}
      <div className="game-container">
        <Game
          scene={WelcomeScene}
          sceneKey="WelcomeScene"
          onNavigate={handleNavigate}
        />
      </div>

      {/* Typing messages */}
      <div className="typing-container">
        <div className="content-wrapper">
          <h1 className="typing-text fade-in">
            {currentMessage.displayedText}
          </h1>
        </div>
      </div>

      {/* Navigation hint */}
      <div className="navigation-hint">
        <p>Press SPACE or walk right →</p>
      </div>
    </div>
  );
}
