const { calculateStreak } = require("../utils/streak");
const { subDays, startOfDay } = require("date-fns");

describe("calculateStreak", () => {
  const today = startOfDay(new Date());

  test("active streak - posted today, yesterday, day before", () => {
    const days = [today, subDays(today, 1), subDays(today, 2)];
    expect(calculateStreak(days)).toBe(3);
  });

  test("broken streak - gap in the middle", () => {
    const days = [
      today,
      subDays(today, 1),
      subDays(today, 5),
      subDays(today, 6),
    ];
    // gap between day-1 and day-5 breaks the streak at 2
    expect(calculateStreak(days)).toBe(2);
  });

  test("zero updates", () => {
    expect(calculateStreak([])).toBe(0);
  });
});
