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
    const textarea = screen.getByRole('textbox', { name: /write a new post/i });
    fireEvent.change(textarea, { target: { value: 'Regression test post from CircleUp.' } });

    const composer = document.querySelector('.composer-modal');
    expect(composer).not.toBeNull();
    fireEvent.click(within(composer as HTMLElement).getByRole('button', { name: /^share post$/i }));
    expect(screen.getByText('Regression test post from CircleUp.')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('circleup-posts') || '[]')[0].text).toBe('Regression test post from CircleUp.');
  });

  it('toggles a like and persists the changed count', () => {
    render(<App />);
    const firstPost = document.querySelector('#post-1');
    expect(firstPost).not.toBeNull();
    const likeButton = within(firstPost as HTMLElement).getByRole('button', { name: /^like post$/i });
    fireEvent.click(likeButton);
    expect(within(firstPost as HTMLElement).getByText('129')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('circleup-posts') || '[]').find((post: {id:number}) => post.id === 1).liked).toBe(true);
  });

  it('filters discover people using the search field', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^discover$/i })[0]);
    fireEvent.change(screen.getByRole('textbox', { name: /search people, interests, or circles/i }), { target: { value: 'Machine Learning' } });
    expect(screen.getByText('Meera Kapoor')).toBeTruthy();
    expect(screen.queryByText('Vikram Patel')).toBeNull();
  });

  it('joins a community and saves the selection locally', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^communities$/i })[0]);
    const communityHeading = screen.getByRole('heading', { name: 'Frontend Friends', exact: true });
    const communityCard = communityHeading.closest('.circle-card');
    expect(communityCard).not.toBeNull();
    fireEvent.click(within(communityCard as HTMLElement).getByRole('button', { name: /join circle/i }));
    expect(JSON.parse(localStorage.getItem('circleup-joined') || '[]')).toContain('Frontend Friends');
    expect(within(communityCard as HTMLElement).getByRole('button', { name: /joined/i })).toBeTruthy();
  });

  it('shows the saved posts view', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^saved$/i })[0]);
    expect(screen.getByRole('heading', { level: 1, name: 'Your little collection', exact: true })).toBeTruthy();
    expect(screen.getByText(/weekend challenge/i)).toBeTruthy();
  });
});
