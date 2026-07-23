import cron, { type ScheduledTask } from 'node-cron';

export function scheduleRouteSync(sync: () => Promise<void>): ScheduledTask {
  return cron.schedule(
    '0 6-20 * * 1-6',
    async () => {
      await sync();
    },
    { timezone: 'Asia/Seoul' }
  );
}
