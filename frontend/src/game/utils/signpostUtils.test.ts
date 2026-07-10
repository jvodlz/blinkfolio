import { describe, it, expect, vi } from 'vitest';
import { createSignpostButton } from './signpostUtils';

vi.mock('phaser', () => ({
  default: {},
}));

function createMockImage() {
  return {
    setScale: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setFlipX: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    disableInteractive: vi.fn().mockReturnThis(),
    on: vi.fn(),
  };
}

function createMockScene(image: ReturnType<typeof createMockImage>) {
  return {
    add: {
      image: vi.fn().mockReturnValue(image),
    },
  } as unknown as Phaser.Scene;
}

function createMockPlayer(x: number) {
  return { x } as Phaser.Physics.Arcade.Sprite;
}

describe('createSignpostButton', () => {
  it('creates the image at given position with expected scale, depth, and flip', () => {
    const image = createMockImage();
    const scene = createMockScene(image);
    const player = createMockPlayer(0);

    createSignpostButton(scene, {
      x: 150,
      y: 200,
      direction: 'right',
      flipX: true,
      player,
      onTriggerImmediate: vi.fn(),
      onWalkToSign: vi.fn(),
    });

    expect(scene.add.image).toHaveBeenCalledWith(0, 0, 'arrow-sign');
    expect(image.setScale).toHaveBeenCalledWith(2);
    expect(image.setDepth).toHaveBeenCalledWith(0.5);
    expect(image.setFlipX).toHaveBeenCalledWith(true);
    expect(image.setPosition).toHaveBeenCalledWith(150, 200);
  });

  it('makes the image interactive', () => {
    const image = createMockImage();
    const scene = createMockScene(image);
    const player = createMockPlayer(0);

    createSignpostButton(scene, {
      x: 150,
      y: 200,
      direction: 'right',
      flipX: true,
      player,
      onTriggerImmediate: vi.fn(),
      onWalkToSign: vi.fn(),
    });

    expect(image.setInteractive).toHaveBeenCalled();
  });

  it('calls onTriggerImmediate (not onWalkToSign) when direction is right and player has reached the button', () => {
    const image = createMockImage();
    const scene = createMockScene(image);
    const player = createMockPlayer(160);

    const onTriggerImmediate = vi.fn();
    const onWalkToSign = vi.fn();

    createSignpostButton(scene, {
      x: 150,
      y: 200,
      direction: 'right',
      flipX: true,
      player,
      onTriggerImmediate,
      onWalkToSign,
    });

    const pointerDownHandler = image.on.mock.calls.find(
      (call) => call[0] === 'pointerdown'
    )?.[1];
    pointerDownHandler();

    expect(onTriggerImmediate).toHaveBeenCalledTimes(1);
    expect(onWalkToSign).not.toHaveBeenCalled();
    expect(image.disableInteractive).toHaveBeenCalledTimes(1);
  });

  it('calls onWalkToSign (not onTriggerImmediate) when direction is right and player has not reached the button', () => {
    const image = createMockImage();
    const scene = createMockScene(image);
    const player = createMockPlayer(50);

    const onTriggerImmediate = vi.fn();
    const onWalkToSign = vi.fn();

    createSignpostButton(scene, {
      x: 250,
      y: 200,
      direction: 'right',
      flipX: true,
      player,
      onTriggerImmediate,
      onWalkToSign,
    });

    const pointerDownHandler = image.on.mock.calls.find(
      (call) => call[0] === 'pointerdown'
    )?.[1];
    pointerDownHandler();

    expect(onWalkToSign).toHaveBeenCalledTimes(1);
    expect(onTriggerImmediate).not.toHaveBeenCalled();
    expect(image.disableInteractive).toHaveBeenCalledTimes(1);
  });

  it('calls onTriggerImmediate when direction is left and player.x <= buttonX', () => {
    const image = createMockImage();
    const scene = createMockScene(image);
    const player = createMockPlayer(40);

    const onTriggerImmediate = vi.fn();
    const onWalkToSign = vi.fn();

    createSignpostButton(scene, {
      x: 150,
      y: 200,
      direction: 'left',
      flipX: false,
      player,
      onTriggerImmediate,
      onWalkToSign,
    });

    const pointerDownHandler = image.on.mock.calls.find(
      (call) => call[0] === 'pointerdown'
    )?.[1];
    pointerDownHandler();

    expect(onTriggerImmediate).toHaveBeenCalledTimes(1);
    expect(onWalkToSign).not.toHaveBeenCalled();
    expect(image.disableInteractive).toHaveBeenCalledTimes(1);
  });

  it('calls onWalkToSign when direction is left and player.x > buttonX', () => {
    const image = createMockImage();
    const scene = createMockScene(image);
    const player = createMockPlayer(300);

    const onTriggerImmediate = vi.fn();
    const onWalkToSign = vi.fn();

    createSignpostButton(scene, {
      x: 150,
      y: 200,
      direction: 'left',
      flipX: false,
      player,
      onTriggerImmediate,
      onWalkToSign,
    });

    const pointerDownHandler = image.on.mock.calls.find(
      (call) => call[0] === 'pointerdown'
    )?.[1];
    pointerDownHandler();

    expect(onWalkToSign).toHaveBeenCalledTimes(1);
    expect(onTriggerImmediate).not.toHaveBeenCalled();
    expect(image.disableInteractive).toHaveBeenCalledTimes(1);
  });
});
