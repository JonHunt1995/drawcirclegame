export type ShareOptions = {
  title: string;
  text: string;
  url: string;
};

export type ShareResult = 'shared' | 'copied' | 'failed' | 'aborted';

export async function shareOrCopy(
  options: ShareOptions,
  btn?: HTMLElement | null
): Promise<ShareResult> {
  // if it ain't fucking firefox...
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(options);
      return 'shared';
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'aborted';
      }
    }
  }

  // if it is fucking firefox or old...
  try {
    await navigator.clipboard.writeText(options.url);
    if (btn) triggerFeedback(btn);
    return 'copied';
  } catch {
    return 'failed';
  }
}

function triggerFeedback(btn: HTMLElement) {
  const original = btn.textContent;
  btn.textContent = 'Copied to clipboard!';
  btn.classList.add('copied');

  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('copied');
  }, 2000);
}
