import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MainScene } from './MainScene';

// Mock Phaser
vi.mock('phaser', () => ({
  default: {
    Scene: class MockScene {
      scene = { key: 'MainScene' };
      load = { spritesheet: vi.fn(), image: vi.fn() };
      anims = { create: vi.fn() };
      input = { keyboard: null };
      physics = {
        add: { sprite: vi.fn(), existing: vi.fn(), collider: vi.fn() },
      };
      add = { rectangle: vi.fn() };
      cameras = { main: { width: 800, height: 600 } };
      scale = { on: vi.fn() };
    },
  },
}));

describe('MainScene', () => {
  let scene: MainScene;

  beforeEach(() => {
    scene = new MainScene();
  });

  it('should have the correct scene key', () => {
    expect(scene.scene.key).toBe('MainScene');
  });

  it('should initialise with onNavigateBack callback', () => {
    const mockCallback = vi.fn();
    scene.init({ onNavigateBack: mockCallback });

    expect(scene['onNavigateBack']).toBe(mockCallback);
  });

  it('should preload all required assets', () => {
    const mockLoad = {
      spritesheet: vi.fn(),
      image: vi.fn(),
    };

    scene.load = mockLoad as any;
    scene.preload();

    // Player
    expect(mockLoad.spritesheet).toHaveBeenCalledWith(
      'idle',
      '/assets/characters/idle.png',
      expect.objectContaining({ frameWidth: 32, frameHeight: 32 })
    );
    expect(mockLoad.spritesheet).toHaveBeenCalledWith(
      'walk',
      '/assets/characters/walk.png',
      expect.objectContaining({ frameWidth: 32, frameHeight: 32 })
    );
    expect(mockLoad.spritesheet).toHaveBeenCalledWith(
      'jump',
      '/assets/characters/jump.png',
      expect.objectContaining({ frameWidth: 32, frameHeight: 32 })
    );
    expect(mockLoad.spritesheet).toHaveBeenCalledWith(
      'faint',
      '/assets/characters/faint.png',
      expect.objectContaining({ frameWidth: 32, frameHeight: 32 })
    );

    // Brick
    expect(mockLoad.image).toHaveBeenCalledWith(
      'brick-simple',
      '/assets/tiles/brick-simple.png'
    );
    expect(mockLoad.image).toHaveBeenCalledWith(
      'brick-interactive',
      '/assets/tiles/brick-interactive.png'
    );
    expect(mockLoad.image).toHaveBeenCalledWith(
      'brick-interactive-hit',
      '/assets/tiles/brick-interactive-hit.png'
    );

    // Items
    expect(mockLoad.image).toHaveBeenCalledWith(
      'flower',
      '/assets/items/flower.png'
    );
    expect(mockLoad.spritesheet).toHaveBeenCalledWith(
      'enemy',
      '/assets/enemies/enemy-simple.png',
      expect.objectContaining({ frameWidth: 16, frameHeight: 16 })
    );
  });

  it('should have player movement constants defined', () => {
    expect(scene['PLAYER_SPEED']).toBeDefined();
    expect(scene['PLAYER_JUMP_VELOCITY']).toBeDefined();
  });

  it('should have ground constants defined', () => {
    expect(scene['GROUND_HEIGHT']).toBeDefined();
    expect(scene['GROUND_OFFSET_FROM_BOTTOM']).toBeDefined();
  });
});
