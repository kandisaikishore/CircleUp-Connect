// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AICompanion from './AICompanion';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CircleUp AI companion', () => {
  it('opens the assistant and displays its suggested prompts', () => {
    render(<AICompanion />);
    fireEvent.click(screen.getByRole('button', { name: 'Open CircleUp AI' }));
    expect(screen.getByRole('region', { name: 'CircleUp AI assistant' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Help me write a post' })).toBeTruthy();
  });

  it('disables send for an empty draft and displays an API answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ answer: 'Try a short, clear post.' }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AICompanion />);
    fireEvent.click(screen.getByRole('button', { name: 'Open CircleUp AI' }));
    const send = screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText('Ask CircleUp AI…'), { target: { value: 'Help with my post' } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    expect(screen.getByRole('status')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Try a short, clear post.')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith('/api/ai/chat', expect.objectContaining({ method: 'POST' }));
  });

  it('shows a clear message when the API responds with an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'AI is not configured.' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    })));
    render(<AICompanion />);
    fireEvent.click(screen.getByRole('button', { name: 'Open CircleUp AI' }));
    fireEvent.change(screen.getByPlaceholderText('Ask CircleUp AI…'), { target: { value: 'Suggest a community' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'AI is not configured.');
  });

  it('can minimize the assistant', () => {
    render(<AICompanion />);
    fireEvent.click(screen.getByRole('button', { name: 'Open CircleUp AI' }));
    fireEvent.click(screen.getByRole('button', { name: 'Minimize assistant' }));
    expect(screen.queryByRole('region', { name: 'CircleUp AI assistant' })).toBeNull();
  });
});
