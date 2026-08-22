const { startOfDay, differenceInCalendarDays } = require("date-fns");

function calculateStreak(postingDays) {
  if (postingDays.length === 0) return 0;

  const today = startOfDay(new Date());
  const daysSinceLastPost = differenceInCalendarDays(today, postingDays[0]);

  // last post was neither today nor yesterday -> streak is dead
  if (daysSinceLastPost > 1) return 0;

  let streak = 1;
  for (let i = 0; i < postingDays.length - 1; i++) {
    const gap = differenceInCalendarDays(postingDays[i], postingDays[i + 1]);
    if (gap === 1) {
      streak++;
    } else {
      break; // gap found, streak stops here
    }
  }

  return streak;
}

module.exports = { calculateStreak };
