import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MainPage } from './MainPage';

vi.mock('phaser', () => ({
  default: {
    AUTO: 'AUTO',
    Scene: class MockScene {},
    Game: class MockGame {
      constructor() {}
      scene = { start: vi.fn() };
      destroy = vi.fn();
    },
  },
}));

// Mock Game component to prevent Phaser initialisation
vi.mock('../game/Game', () => ({
  Game: () => <div data-testid="mocked-game">Mocked Game</div>,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('MainPage', () => {
  it('should render the main page container', () => {
    renderWithRouter(<MainPage />);
    
    const mainPage = screen.getByTestId('main-page');
    expect(mainPage).toBeInTheDocument();
  });

  it('should render three content sections', () => {
    renderWithRouter(<MainPage />);
    
    expect(screen.getByText('About Me')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Interests')).toBeInTheDocument();
  });

  it('should have game layer container', () => {
    renderWithRouter(<MainPage />);
    
    const gameLayer = screen.getByTestId('game-layer');
    expect(gameLayer).toBeInTheDocument();
  });

  it('should render mocked game component', () => {
    renderWithRouter(<MainPage />);
    
    const mockedGame = screen.getByTestId('mocked-game');
    expect(mockedGame).toBeInTheDocument();
  });

  it('should apply main-palette class', () => {
    renderWithRouter(<MainPage />);
    
    const mainPage = screen.getByTestId('main-page');
    expect(mainPage).toHaveClass('main-palette');
  });
});
