import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { MainPage } from './MainPage.tsx';

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

    // Check for section headings
    expect(screen.getByText('About Me')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Interests')).toBeInTheDocument();
  });

  it('should render About Me content', () => {
    renderWithRouter(<MainPage />);

    expect(screen.getByText(/Thinker/i)).toBeInTheDocument();
  });

  it('should render Skills list', () => {
    renderWithRouter(<MainPage />);

    expect(screen.getByText(/Metacognition/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk awareness/i)).toBeInTheDocument();
  });

  it('should render Interests content', () => {
    renderWithRouter(<MainPage />);

    expect(screen.getByText(/Foreign Languages/i)).toBeInTheDocument();
  });

  it('should have game layer container', () => {
    renderWithRouter(<MainPage />);

    const gameLayer = screen.getByTestId('game-layer');
    expect(gameLayer).toBeInTheDocument();
  });

  it('should apply main-palette class', () => {
    renderWithRouter(<MainPage />);

    const mainPage = screen.getByTestId('main-page');
    expect(mainPage).toHaveClass('main-palette');
  });
});
