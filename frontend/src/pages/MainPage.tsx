import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Game } from '../game/Game';
import { MainScene } from '../game/scenes/MainScene';
import './MainPage.css';

/**
 * Returns true if the touch landed on or inside a content card.
 */
function isTouchOnCard(e: TouchEvent): boolean {
  return e
    .composedPath()
    .some(
      (el) => el instanceof Element && el.classList.contains('content-section')
    );
}

/**
 * Forwards a touch event to the Phaser canvas.
 */
function forwardTouchToCanvas(e: TouchEvent, canvas: HTMLCanvasElement): void {
  const forwarded = new TouchEvent(e.type, {
    bubbles: e.bubbles,
    cancelable: e.cancelable,
    touches: Array.from(e.touches),
    targetTouches: Array.from(e.targetTouches),
    changedTouches: Array.from(e.changedTouches),
  });
  canvas.dispatchEvent(forwarded);
}

export function MainPage() {
  const navigate = useNavigate();
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const handleNavigateBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  /**
   * Touch forwarding — bridges iOS scroll and Phaser swipe input.
   */
  useEffect(() => {
    const contentArea = contentAreaRef.current;
    if (!contentArea) return;

    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent): void => {
      if (!isTouchOnCard(e)) {
        forwardTouchToCanvas(e, canvas as HTMLCanvasElement);
      }
    };

    const handleTouchEnd = (e: TouchEvent): void => {
      if (!isTouchOnCard(e)) {
        forwardTouchToCanvas(e, canvas as HTMLCanvasElement);
      }
    };

    contentArea.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    contentArea.addEventListener('touchend', handleTouchEnd, {
      passive: true,
    });

    return () => {
      contentArea.removeEventListener('touchstart', handleTouchStart);
      contentArea.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Rendered via Portal so it escapes main-page's overflow:hidden
  // Only the content-area div is portalled — no wrapper
  const contentArea = (
    <div className="content-area" ref={contentAreaRef}>
      <div className="content-row">
        <section className="content-section" data-testid="about-section">
          <h2>About Me</h2>
          <ul>
            <li>
              I'm a curious thinker. Most days, a developer passionate about
              cyber security and creating experiences that blend creativity with
              technical excellence.
            </li>
            <li>
              I believe security should be baked into the design from the start,
              not treated as an afterthought.
            </li>
            <li>
              Former graduate in psychology. I enjoy stepping into the user's
              shoes to create experiences that make them crack a smile, while
              maintaining strict data protection standards.
            </li>
            <li>Sometimes, I think I am a bit of a dog whisperer.</li>
          </ul>
        </section>

        <section className="content-section" data-testid="skills-section">
          <h2>Skills</h2>
          <ul>
            <li>Full-Stack Development</li>
            <li>Security Engineering</li>
            <li>Systems Thinking</li>
            <li>Metacognition</li>
            <li>Risk Awareness</li>
          </ul>
        </section>

        <section className="content-section" data-testid="interests-section">
          <h2>Interests</h2>
          <ul>
            <li>Creative coding</li>
            <li>
              Cyber security. Engaging in HackTheBox and community events with
              infosec professionals
            </li>
            <li>Learning foreign languages. (I'm also a language tutor)</li>
            <li>
              Food. The cooking, science, and the history of food. (And of
              course, the eating)
            </li>
            <li>Hanging out with dogs</li>
          </ul>
        </section>
      </div>
    </div>
  );

  return (
    <div className="main-page main-palette" data-testid="main-page">
      {createPortal(contentArea, document.body)}

      <div className="game-layer" data-testid="game-layer">
        <Game
          scene={MainScene}
          sceneKey="MainScene"
          onNavigateBack={handleNavigateBack}
        />
      </div>
    </div>
  );
}
