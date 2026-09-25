import { shareOrCopy } from './share';

const shareBtn = document.getElementById('share-btn');

if (shareBtn) {
  shareBtn.addEventListener('click', async () => {
    await shareOrCopy(
      {
        title: document.title,
        text: 'Can you beat my score?',
        url: window.location.href,
      },
      shareBtn
    );
  });
}
