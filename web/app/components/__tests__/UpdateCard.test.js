import {render, screen, fireEvent, waitFor} from "@testing-library/react";
import UpdateCard, {formatRelativeTime, groupReactions} from "../UpdateCard";
import { addReaction, removeReaction, editUpdate } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
  editUpdate: jest.fn(),
}));

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

  const auth = { token: "test-token", user: { _id: "u1" } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it("adds a reaction when clicking an emoji the user hasn't reacted with", async () => {
    const updatedUpdate = {
      ...update,
      reactions: [
        ...update.reactions,
        { _id: "r2", emoji: "🎉", user: { _id: "u1" } },
      ],
    };
    addReaction.mockResolvedValueOnce({ update: updatedUpdate });

    const onUpdated = jest.fn();
    render(<UpdateCard update={update} auth={auth} onUpdated={onUpdated} />);

    expect(
      screen.getByRole("button", { name: "🎉" })
    ).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "🎉" }));

    await waitFor(() => {
      expect(addReaction).toHaveBeenCalledWith(
        { updateId: "1", emoji: "🎉" },
        "test-token"
      );
    });
    expect(onUpdated).toHaveBeenCalledWith(updatedUpdate);
  });

  it("removes the user's own reaction when clicking that emoji", async () => {
    const ownReactionUpdate = {
      ...update,
      reactions: [{ _id: "r1", emoji: "👍", user: { _id: "u1" } }],
    };
    const updatedUpdate = {
      ...ownReactionUpdate,
      reactions: [],
    };
    removeReaction.mockResolvedValueOnce({ update: updatedUpdate });

    const onUpdated = jest.fn();
    render(
      <UpdateCard update={ownReactionUpdate} auth={auth} onUpdated={onUpdated} />
    );

    expect(
      screen.getByRole("button", { name: "👍" })
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "👍" }));

    await waitFor(() => {
      expect(removeReaction).toHaveBeenCalledWith(
        { updateId: "1", reactionId: "r1" },
        "test-token"
      );
    });
    expect(addReaction).not.toHaveBeenCalled();
    expect(onUpdated).toHaveBeenCalledWith(updatedUpdate);
  });

  it("adds the user's own reaction when the emoji exists but belongs to another user", async () => {
    const otherUserReactionUpdate = {
      ...update,
      reactions: [{ _id: "r1", emoji: "👍", user: { _id: "u2" } }],
    };
    const updatedUpdate = {
      ...otherUserReactionUpdate,
      reactions: [
        ...otherUserReactionUpdate.reactions,
        { _id: "r2", emoji: "👍", user: { _id: "u1" } },
      ],
    };
    addReaction.mockResolvedValueOnce({ update: updatedUpdate });

    const onUpdated = jest.fn();
    render(
      <UpdateCard
        update={otherUserReactionUpdate}
        auth={auth}
        onUpdated={onUpdated}
      />
    );

    expect(
      screen.getByRole("button", { name: "👍" })
    ).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "👍" }));

    await waitFor(() => {
      expect(addReaction).toHaveBeenCalledWith(
        { updateId: "1", emoji: "👍" },
        "test-token"
      );
    });
    expect(removeReaction).not.toHaveBeenCalled();
    expect(onUpdated).toHaveBeenCalledWith(updatedUpdate);
  });

    it("shows an edit form when the author clicks Edit", () => {
    render(<UpdateCard update={update} auth={auth} onUpdated={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("textbox", { name: /update text/i })).toHaveValue(
      update.text
    );
    expect(screen.getByRole("combobox", { name: /status/i })).toHaveValue(
      update.status
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

    it("saves the edited update and reports the updated update", async () => {
    const editedUpdate = {
      ...update,
      text: "Fixed the login page bug",
      status: "on-track",
    };

    editUpdate.mockResolvedValueOnce({ update: editedUpdate });

    const onUpdated = jest.fn();

    render(
      <UpdateCard
        update={update}
        auth={auth}
        onUpdated={onUpdated}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const textInput = screen.getByRole("textbox", { name: /update text/i });
    const statusInput = screen.getByRole("combobox", { name: /status/i });

    fireEvent.change(textInput, {
      target: { value: "Fixed the login page bug" },
    });

    fireEvent.change(statusInput, {
      target: { value: "on-track" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(editUpdate).toHaveBeenCalledWith(
        "1",
        {
          text: "Fixed the login page bug",
          status: "on-track",
        },
        "test-token"
      );
    });

    expect(onUpdated).toHaveBeenCalledWith(editedUpdate);
  });

    it("does not show Edit to users who do not own the update", () => {
    const otherAuth = {
      token: "other-token",
      user: { _id: "u2" },
    };

    render(
      <UpdateCard
        update={update}
        auth={otherAuth}
        onUpdated={() => {}}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Edit" })
    ).not.toBeInTheDocument();
  });

  it("cancels editing without saving the draft", () => {
    const onUpdated = jest.fn();

    render(
      <UpdateCard
        update={update}
        auth={auth}
        onUpdated={onUpdated}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const textInput = screen.getByRole("textbox", { name: /update text/i });

    fireEvent.change(textInput, {
      target: { value: "Temporary edit" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("textbox", { name: /update text/i })
    ).not.toBeInTheDocument();

    expect(screen.getByText("Shipped the login page")).toBeInTheDocument();
    expect(editUpdate).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("resets cancelled edits when entering edit mode again", () => {
    render(
      <UpdateCard
        update={update}
        auth={auth}
        onUpdated={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const textInput = screen.getByRole("textbox", { name: /update text/i });

    fireEvent.change(textInput, {
      target: { value: "Cancelled draft" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(
      screen.getByRole("textbox", { name: /update text/i })
    ).toHaveValue(update.text);

    expect(
      screen.getByRole("combobox", { name: /status/i })
    ).toHaveValue(update.status);
  });

  it("shows an error and keeps the edit form open when saving fails", async () => {
    editUpdate.mockRejectedValueOnce(new Error("Failed to save update"));

    const onUpdated = jest.fn();

    render(
      <UpdateCard
        update={update}
        auth={auth}
        onUpdated={onUpdated}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const textInput = screen.getByRole("textbox", { name: /update text/i });

    fireEvent.change(textInput, {
      target: { value: "Draft with an error" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to save update")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("textbox", { name: /update text/i })
    ).toHaveValue("Draft with an error");

    expect(
      screen.getByRole("button", { name: "Cancel" })
    ).toBeInTheDocument();

    expect(onUpdated).not.toHaveBeenCalled();
  });
});
