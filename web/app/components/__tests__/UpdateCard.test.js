import { render, screen } from "@testing-library/react";
import UpdateCard, { formatRelativeTime, groupReactions } from "../UpdateCard";

describe("formatRelativeTime", () => {
  const now = new Date("2026-08-12T12:00:00.000Z").getTime();

  it("shows just now for an update less than one minute old", () => {
    const result = formatRelativeTime(now - 30 * 1000, now);
    expect(result).toBe("just now");
  });

  it("shows 1 minute ago for an update exactly one minute old", () => {
    const result = formatRelativeTime(now - 1 * 60 * 1000, now);
    expect(result).toBe("1 minute ago");
  });

  it("shows completed minutes for an update less than one hour old", () => {
    const result = formatRelativeTime(now - 5 * 60 * 1000, now);
    expect(result).toBe("5 minutes ago");
  });

  it("shows 1 hour ago for an update exactly one hour old", () => {
    const result = formatRelativeTime(now - 1 * 60 * 60 * 1000, now);
    expect(result).toBe("1 hour ago");
  });

  it("shows completed hours for an update less than one day old", () => {
    const result = formatRelativeTime(now - 5 * 60 * 60 * 1000, now);
    expect(result).toBe("5 hours ago");
  });

  it("shows 1 day ago for an update exactly one day old", () => {
    const result = formatRelativeTime(now - 1 * 24 * 60 * 60 * 1000, now);
    expect(result).toBe("1 day ago");
  });

  it("shows completed days for an update less than seven days old", () => {
    const result = formatRelativeTime(now - 5 * 24 * 60 * 60 * 1000, now);
    expect(result).toBe("5 days ago");
  });

  it("shows the full date and time for an update seven days old or older", () => {
    const createdAt = now - 7 * 24 * 60 * 60 * 1000;
    const result = formatRelativeTime(createdAt, now);
    const expected = new Date(createdAt).toLocaleString();
    expect(result).toBe(expected);
  });

  it("shows just now for an update with a future timestamp", () => {
    const result = formatRelativeTime(now + 30 * 1000, now);
    expect(result).toBe("just now");
  });
});

describe("groupReactions", () => {
  it("counts reactions by emoji", () => {
    const reactions = [{ emoji: "👍" }, { emoji: "👍" }, { emoji: "🎉" }];
    expect(groupReactions(reactions)).toEqual({ "👍": 2, "🎉": 1 });
  });

  it("returns an empty object for no reactions", () => {
    expect(groupReactions([])).toEqual({});
  });
});

describe("UpdateCard", () => {
  const update = {
    _id: "1",
    text: "Shipped the login page",
    status: "done",
    createdAt: new Date().toISOString(),
    author: { _id: "u1", displayName: "Amina Yusuf" },
    reactions: [{ emoji: "👍", user: { _id: "u2" } }],
  };

  it("renders the update text and author", () => {
    render(<UpdateCard update={update} auth={null} onUpdated={() => {}} />);

    expect(screen.getByText("Shipped the login page")).toBeInTheDocument();
    expect(screen.getByText("Amina Yusuf")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders a relative timestamp with the original dateTime value", () => {
    const createdAt = new Date(Date.now() - 30 * 1000).toISOString();
    const recentUpdate = {
      ...update,
      createdAt,
    };
    render(<UpdateCard update={recentUpdate} auth={null} onUpdated={() => {}} />);
    const timeElement = screen.getByText("just now");
    expect(timeElement).toHaveAttribute("datetime", createdAt);
  });

  it("does not show reaction buttons when logged out", () => {
    render(<UpdateCard update={update} auth={null} onUpdated={() => {}} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
