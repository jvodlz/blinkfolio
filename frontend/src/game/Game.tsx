import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { WelcomeScene } from './scenes/WelcomeScene';

interface GameProps {
  onNavigate: () => void;
}

export function Game({ onNavigate }: GameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: containerRef.current,
      transparent: true,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 800, x: 0 },
          debug: false,
        },
      },
      scene: WelcomeScene,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
      },
    };

    gameRef.current = new Phaser.Game(config);

    gameRef.current.scene.start('WelcomeScene', { onNavigate });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [onNavigate]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
}
