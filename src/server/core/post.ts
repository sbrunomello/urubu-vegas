import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'Urubu Vegas: Where fortunes go to die',
    entry: 'default',
    textFallback: {
      text: 'Urubu Vegas is a fictional arcade casino game using virtual credits only. No purchases, prizes or withdrawals.',
    },
    styles: {
      backgroundColor: '#07030dff',
      backgroundColorDark: '#07030dff',
      heightPixels: 320,
    },
  });
};
