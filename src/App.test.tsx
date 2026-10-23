// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
});

describe('CircleUp Connect core interactions', () => {
  it('renders the home feed and starter posts', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /your corner of the internet/i })).toBeTruthy();
    expect(screen.getByText(/finally shipped my first ai side project/i)).toBeTruthy();
  });

  it('opens the composer and publishes a non-empty post', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /create a post/i }));
    const textarea = screen.getByPlaceholderText(/what’s on your mind/i);
    fireEvent.change(textarea, { target: { value: 'Regression test post from CircleUp.' } });
    const composer = textarea.closest('.composer-modal');
    expect(composer).not.toBeNull();
    fireEvent.click(within(composer as HTMLElement).getByRole('button', { name: /^share post$/i }));
    expect(screen.getByText('Regression test post from CircleUp.')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('circleup-posts') || '[]')[0].text).toBe('Regression test post from CircleUp.');
  });

  it('toggles a like and persists the changed count', () => {
    render(<App />);
    const likeCount = screen.getByText('128');
    const likeButton = likeCount.closest('button');
    expect(likeButton).not.toBeNull();
    fireEvent.click(likeButton!);
    expect(screen.getByText('129')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('circleup-posts') || '[]').find((post: {id:number}) => post.id === 1).liked).toBe(true);
  });

  it('filters discover people using the search field', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^discover$/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/search people, topics/i), { target: { value: 'Machine Learning' } });
    expect(screen.getByText('Meera Kapoor')).toBeTruthy();
    expect(screen.queryByText('Vikram Patel')).toBeNull();
  });

  it('joins a community and saves the selection locally', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^communities$/i })[0]);
    const joinButtons = screen.getAllByRole('button', { name: /join circle/i });
    expect(joinButtons.length).toBeGreaterThan(0);
    fireEvent.click(joinButtons[0]);
    expect(JSON.parse(localStorage.getItem('circleup-joined') || '[]')).toContain('Frontend Friends');
    expect(screen.getAllByRole('button', { name: /joined/i }).length).toBeGreaterThan(0);
  });

  it('shows the saved posts view', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^saved$/i }));
    expect(screen.getByRole('heading', { name: /your little collection/i, level: 1 })).toBeTruthy();
    expect(screen.getByText(/weekend challenge/i)).toBeTruthy();
  });
});
