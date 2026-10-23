// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const apiMocks = vi.hoisted(() => ({
  listPosts: vi.fn(),
  createPost: vi.fn(),
  toggleLike: vi.fn(),
  addComment: vi.fn(),
  listCommunities: vi.fn(),
  toggleMembership: vi.fn()
}));

vi.mock('./lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) { super(message); this.status = status; }
  },
  postsApi: {
    list: apiMocks.listPosts,
    create: apiMocks.createPost,
    toggleLike: apiMocks.toggleLike,
    addComment: apiMocks.addComment,
    listComments: vi.fn()
  },
  communitiesApi: {
    list: apiMocks.listCommunities,
    toggleMembership: apiMocks.toggleMembership
  }
}));

import App from './App';

const apiPosts = [
  { id: 1, name: 'Aarav Mehta', email: 'aarav@example.com', body: 'Finally shipped my first AI side project! 🚀', created_at: '2026-10-23T08:00:00.000Z', likes: 128, comments: 24, liked_by_me: false },
  { id: 2, name: 'Priya Sharma', email: 'priya@example.com', body: 'A reminder for fellow designers: your first draft does not need to be brilliant.', created_at: '2026-10-23T07:30:00.000Z', likes: 96, comments: 18, liked_by_me: true },
  { id: 3, name: 'Rohan Iyer', email: 'rohan@example.com', body: 'Weekend challenge: build something useful in 2 hours, no tutorials allowed.', created_at: '2026-10-23T07:00:00.000Z', likes: 142, comments: 31, liked_by_me: false },
  { id: 4, name: 'Naina Verma', email: 'naina@example.com', body: 'Booked a cozy coffee spot for a creative sprint tomorrow.', created_at: '2026-10-23T06:00:00.000Z', likes: 76, comments: 12, liked_by_me: false }
];

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  apiMocks.listPosts.mockResolvedValue(apiPosts);
  apiMocks.createPost.mockImplementation(async (body: string) => ({ id: 99, name: 'Kandi Sai Kishore', body, created_at: '2026-10-23T08:30:00.000Z' }));
  apiMocks.toggleLike.mockResolvedValue({ liked: true });
  apiMocks.addComment.mockImplementation(async (_id: number, body: string) => ({ id: 1, body, created_at: '2026-10-23T08:30:00.000Z' }));
  apiMocks.listComments.mockResolvedValue([]);
  apiMocks.listCommunities.mockResolvedValue([
    { id: 1, name: 'AI Builders', description: 'AI', members: 10, joined_by_me: true },
    { id: 2, name: 'Frontend Friends', description: 'Frontend', members: 8, joined_by_me: false },
    { id: 3, name: 'Build In Public', description: 'Build', members: 5, joined_by_me: false },
    { id: 4, name: 'Creative Corner', description: 'Creative', members: 4, joined_by_me: true }
  ]);
  apiMocks.toggleMembership.mockResolvedValue({ joined: true });
});

afterEach(() => {
  cleanup();
});

describe('CircleUp Connect core interactions', () => {
  it('renders the home feed from the API', async () => {
    render(<App />);
    expect(await screen.findByText(/finally shipped my first ai side project/i)).toBeTruthy();
    await waitFor(() => expect(apiMocks.listPosts).toHaveBeenCalledTimes(1));
  });

  it('publishes a post through the API', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /create post/i }));
    fireEvent.change(screen.getByPlaceholderText(/what’s on your mind/i), { target: { value: 'Regression test post from CircleUp.' } });
    fireEvent.click(screen.getByRole('button', { name: /share post/i }));
    expect(await screen.findByText('Regression test post from CircleUp.')).toBeTruthy();
    expect(apiMocks.createPost).toHaveBeenCalledWith('Regression test post from CircleUp.');
  });

  it('toggles a like through the API', async () => {
    render(<App />);
    const likeCount = await screen.findByText('128');
    fireEvent.click(likeCount.closest('button')!);
    await waitFor(() => expect(apiMocks.toggleLike).toHaveBeenCalledWith(1));
    expect(screen.getByText('129')).toBeTruthy();
  });

  it('filters discover people using the search field', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^discover$/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/search people, topics/i), { target: { value: 'Machine Learning' } });
    expect(screen.getByText('Meera Kapoor')).toBeTruthy();
    expect(screen.queryByText('Vikram Patel')).toBeNull();
  });

  it('joins a community through the API', async () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^communities$/i })[0]);
    await screen.findByText('Build In Public');
    fireEvent.click(screen.getAllByRole('button', { name: /join circle/i })[0]);
    await waitFor(() => expect(apiMocks.toggleMembership).toHaveBeenCalled());
  });

  it('saves an API post to the local saved collection', async () => {
    render(<App />);
    await screen.findByText(/finally shipped my first ai side project/i);
    const postCard = screen.getByText(/finally shipped my first ai side project/i).closest('article');
    fireEvent.click(within(postCard!).getByRole('button', { name: 'Save post' }));
    fireEvent.click(screen.getByRole('button', { name: /^saved$/i }));
    expect(screen.getByRole('heading', { name: /your little collection/i, level: 1 })).toBeTruthy();
    expect(screen.getByText(/finally shipped my first ai side project/i)).toBeTruthy();
  });
});
