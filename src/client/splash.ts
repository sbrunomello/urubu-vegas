import { requestExpandedMode } from '@devvit/web/client';

const startButton = document.getElementById('start-button');

if (startButton instanceof HTMLButtonElement) {
  startButton.addEventListener('click', (event) => {
    try {
      requestExpandedMode(event, 'game');
    } catch (error) {
      console.error('Failed to enter expanded mode:', error);
    }
  });
}
