import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shareOrCopy, type ShareOptions } from '../share';

describe('shareOrCopy', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  const testOptions: ShareOptions = {
    title: 'DrawCircle - 94.5%',
    text: 'Check out my circle drawing!',
    url: 'https://example.com/game/123',
  };

  it('calls navigator.share when available and returns "shared"', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const clipboardMock = vi.fn();

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        share: shareMock,
        clipboard: { writeText: clipboardMock },
      },
      configurable: true,
      writable: true,
    });

    const result = await shareOrCopy(testOptions);

    expect(result).toBe('shared');
    expect(shareMock).toHaveBeenCalledWith(testOptions);
    expect(clipboardMock).not.toHaveBeenCalled();
  });

  it('handles user cancellation (AbortError) without falling back to clipboard', async () => {
    const abortError = new DOMException('Share canceled', 'AbortError');
    const shareMock = vi.fn().mockRejectedValue(abortError);
    const clipboardMock = vi.fn();

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        share: shareMock,
        clipboard: { writeText: clipboardMock },
      },
      configurable: true,
      writable: true,
    });

    const mockBtn = {
      textContent: 'Share Result',
      classList: { add: vi.fn(), remove: vi.fn() },
    } as unknown as HTMLElement;

    const result = await shareOrCopy(testOptions, mockBtn);

    expect(result).toBe('aborted');
    expect(shareMock).toHaveBeenCalledWith(testOptions);
    expect(clipboardMock).not.toHaveBeenCalled();
    expect(mockBtn.textContent).toBe('Share Result');
    expect(mockBtn.classList.add).not.toHaveBeenCalled();
  });

  it('falls back to clipboard when navigator.share is undefined and updates button feedback', async () => {
    const clipboardMock = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        share: undefined,
        clipboard: { writeText: clipboardMock },
      },
      configurable: true,
      writable: true,
    });

    const mockBtn = {
      textContent: 'Share Result',
      classList: { add: vi.fn(), remove: vi.fn() },
    } as unknown as HTMLElement;

    const result = await shareOrCopy(testOptions, mockBtn);

    expect(result).toBe('copied');
    expect(clipboardMock).toHaveBeenCalledWith(testOptions.url);
    expect(mockBtn.textContent).toBe('Copied to clipboard!');
    expect(mockBtn.classList.add).toHaveBeenCalledWith('copied');

    // Advance 2 seconds to verify text and class revert
    vi.advanceTimersByTime(2000);
    expect(mockBtn.textContent).toBe('Share Result');
    expect(mockBtn.classList.remove).toHaveBeenCalledWith('copied');
  });

  it('falls back to clipboard when navigator.share fails with a non-abort error', async () => {
    const genericError = new Error('NotAllowedError');
    const shareMock = vi.fn().mockRejectedValue(genericError);
    const clipboardMock = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        share: shareMock,
        clipboard: { writeText: clipboardMock },
      },
      configurable: true,
      writable: true,
    });

    const result = await shareOrCopy(testOptions);

    expect(result).toBe('copied');
    expect(clipboardMock).toHaveBeenCalledWith(testOptions.url);
  });

  it('returns "failed" when both share and clipboard fail', async () => {
    const shareMock = vi.fn().mockRejectedValue(new Error('Share failed'));
    const clipboardMock = vi.fn().mockRejectedValue(new Error('Clipboard denied'));

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        share: shareMock,
        clipboard: { writeText: clipboardMock },
      },
      configurable: true,
      writable: true,
    });

    const result = await shareOrCopy(testOptions);

    expect(result).toBe('failed');
  });
});
