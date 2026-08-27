import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis, reddit } from '@devvit/web/server';
import { createPost } from '../core/post';
import { loadTelemetrySummary } from '../urubuVegas/telemetryStore';

export const menu = new Hono();

const isCurrentUserModerator = async (): Promise<boolean> => {
  const [user, subredditName] = await Promise.all([
    reddit.getCurrentUser(),
    Promise.resolve(context.subredditName),
  ]);
  if (!user || !subredditName) return false;

  const subreddit = await reddit.getSubredditByName(subredditName);
  const moderators = await subreddit.getModerators().all();
  return moderators.some((moderator) => moderator.username === user.username);
};

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/telemetry', async (c) => {
  try {
    if (!(await isCurrentUserModerator())) {
      return c.json<UiResponse>(
        { showToast: 'Moderator access required.' },
        403
      );
    }

    const summary = await loadTelemetrySummary(redis, 5);
    const recent = summary.recent
      .map((visitor) => `u/${visitor.username}`)
      .join(', ');

    return c.json<UiResponse>(
      {
        showToast:
          `Visitors ${summary.uniqueVisitors} • Opens ${summary.totalOpens} • ` +
          `Bailouts ${summary.totalBailouts}` +
          (recent ? ` • Recent: ${recent}` : ''),
      },
      200
    );
  } catch (error) {
    console.error('Telemetry summary failed:', error);
    return c.json<UiResponse>(
      { showToast: 'Could not load telemetry.' },
      500
    );
  }
});
