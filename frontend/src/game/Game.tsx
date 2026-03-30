import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

interface GameProps {
  scene: typeof Phaser.Scene;
  sceneKey: string;
  onNavigate?: () => void;
  onNavigateBack?: () => void;
}

export function Game({
  scene,
  sceneKey,
  onNavigate,
  onNavigateBack,
}: GameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    console.log(`Game: Initialising ${sceneKey}...`);

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
          debug: true,
        },
      },
      scene: scene,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
      },
    };

    gameRef.current = new Phaser.Game(config);
    console.log(`Game: Starting ${sceneKey}...`);

    // Start scene with appropriate callback
    const sceneData = onNavigate
      ? { onNavigate }
      : onNavigateBack
        ? { onNavigateBack }
        : {};

    gameRef.current.scene.start(sceneKey, sceneData);

    return () => {
      console.log(`Game: Cleaning up ${sceneKey}...`);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [scene, sceneKey, onNavigate, onNavigateBack]);

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
