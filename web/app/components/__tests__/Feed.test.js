import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Feed from "../Feed";
import { listUpdates } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  listUpdates: jest.fn(),
}));

jest.mock("../UpdateCard", () => {
  return function MockUpdateCard() {
    return <div>Mock Update Card</div>;
  };
});

describe("Feed - handleShowMyUpdates", () => {
  const auth = {
    user: {
      displayName: "Test User",
      _id: "u1",
    },
  };

  beforeEach(() => {
    listUpdates.mockResolvedValue({ updates: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("sets the author filter to the logged-in user's ID when Show My Updates is checked", async () => {
    render(<Feed auth={auth} refreshToken={0} />);

    const checkbox = screen.getByRole("checkbox", {
      name: "Show My Updates",
    });

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(listUpdates).toHaveBeenLastCalledWith({
        status: undefined,
        author: "u1",
        sort: "newest",
      });
    });

    expect(checkbox).toBeChecked();
  });

  it("clears the author filter when Show My Updates is unchecked", async () => {
    render(<Feed auth={auth} refreshToken={0} />);

    const checkbox = screen.getByRole("checkbox", {
      name: "Show My Updates",
    });

    // Turn the filter on first.
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(listUpdates).toHaveBeenLastCalledWith({
        status: undefined,
        author: "u1",
        sort: "newest",
      });
    });

    // Turn the filter off.
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(listUpdates).toHaveBeenLastCalledWith({
        status: undefined,
        author: undefined,
        sort: "newest",
      });
    });

    expect(checkbox).not.toBeChecked();
  });

  it("keeps all authors available after selecting an author", async () => {
    const allUpdates = [
      {
        _id: "update-1",
        author: {
          _id: "u1",
          displayName: "Diego Fernandez",
        },
      },
      {
        _id: "update-2",
        author: {
          _id: "u2",
          displayName: "Priya Sharma",
        },
      },
      {
        _id: "update-3",
        author: {
          _id: "u3",
          displayName: "Amina Khan",
        },
      },
    ];

    listUpdates.mockImplementation(({ author } = {}) => {
      if (author === "u1") {
        return Promise.resolve({
          updates: [allUpdates[0]],
        });
      }

      return Promise.resolve({
        updates: allUpdates,
      });
    });

    render(<Feed auth={auth} refreshToken={0} />);

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: "Diego Fernandez" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Priya Sharma" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Amina Khan" }),
      ).toBeInTheDocument();
    });

    const authorSelect = screen.getAllByRole("combobox")[1];

    fireEvent.change(authorSelect, {
      target: { value: "u1" },
    });

    await waitFor(() => {
      expect(listUpdates).toHaveBeenLastCalledWith({
        status: undefined,
        author: "u1",
        sort: "newest",
      });
    });

    expect(
      screen.getByRole("option", { name: "Diego Fernandez" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Priya Sharma" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Amina Khan" }),
    ).toBeInTheDocument();
  });

  it("keeps all authors available when a status filter is applied", async () => {
    const allUpdates = [
      {
        _id: "update-1",
        status: "on-track",
        author: {
          _id: "u1",
          displayName: "Diego Fernandez",
        },
      },
      {
        _id: "update-2",
        status: "blocked",
        author: {
          _id: "u2",
          displayName: "Priya Sharma",
        },
      },
    ];

    listUpdates.mockImplementation(({ status } = {}) => {
      if (status === "on-track") {
        return Promise.resolve({
          updates: [allUpdates[0]],
        });
      }

      return Promise.resolve({
        updates: allUpdates,
      });
    });

    render(<Feed auth={auth} refreshToken={0} />);

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: "Diego Fernandez" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Priya Sharma" }),
      ).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole("combobox")[0];

    fireEvent.change(statusSelect, {
      target: { value: "on-track" },
    });

    await waitFor(() => {
      expect(listUpdates).toHaveBeenLastCalledWith({
        status: "on-track",
        author: undefined,
        sort: "newest",
      });
    });

    expect(
      screen.getByRole("option", { name: "Diego Fernandez" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Priya Sharma" }),
    ).toBeInTheDocument();
  });
});

describe("Feed - jump to top button", () => {
  beforeEach(() => {
    listUpdates.mockResolvedValue({ updates: [] });
    window.innerHeight = 800;
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    window.scrollY = 0;
  });

  it("hides the button near the top and shows it after scrolling down", async () => {
    render(<Feed auth={null} refreshToken={0} />);

    expect(
      screen.queryByRole("button", { name: "Jump to top" }),
    ).not.toBeInTheDocument();

    window.scrollY = 1000;
    fireEvent.scroll(window);

    expect(
      await screen.findByRole("button", { name: "Jump to top" }),
    ).toBeInTheDocument();

    window.scrollY = 0;
    fireEvent.scroll(window);

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Jump to top" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("smoothly scrolls to the top when clicked", async () => {
    render(<Feed auth={null} refreshToken={0} />);

    window.scrollY = 1000;
    fireEvent.scroll(window);

    const button = await screen.findByRole("button", {
      name: "Jump to top",
    });
    fireEvent.click(button);

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });
});

describe("Feed - clear all filters", () => {
  const auth = {
    user: { displayName: "Test User", _id: "u1" },
  };

  // One update, so the feed is not in its empty state -- the point of this
  // control is that it exists before a user stumbles into that state.
  const updates = [
    {
      _id: "up1",
      text: "shipped",
      status: "blocked",
      tags: ["release"],
      author: { _id: "u2", displayName: "Someone Else" },
      createdAt: "2026-08-18T10:00:00.000Z",
      reactions: [],
    },
  ];

  beforeEach(() => {
    listUpdates.mockResolvedValue({ updates });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const clearButton = () =>
    screen.getAllByRole("button", { name: "Clear filters" })[0];

  it("is visible but disabled when nothing is filtered", async () => {
    render(<Feed auth={auth} refreshToken={0} />);

    await waitFor(() => expect(listUpdates).toHaveBeenCalled());

    expect(clearButton()).toBeInTheDocument();
    expect(clearButton()).toBeDisabled();
  });

  it.each([
    ["status", 0, "blocked"],
    ["author", 1, "u2"],
    ["tag", 2, "release"],
    ["sort", 3, "oldest"],
  ])("enables and then clears the %s filter", async (_name, index, value) => {
    render(<Feed auth={auth} refreshToken={0} />);
    await waitFor(() => expect(listUpdates).toHaveBeenCalled());

    const select = screen.getAllByRole("combobox")[index];
    fireEvent.change(select, { target: { value } });

    expect(select).toHaveValue(value);
    await waitFor(() => expect(clearButton()).toBeEnabled());

    fireEvent.click(clearButton());

    // Back to the default, and the control disables itself again.
    await waitFor(() => expect(clearButton()).toBeDisabled());
    expect(select).toHaveValue(index === 3 ? "newest" : "");
  });

  it("clears Show My Updates along with the author filter", async () => {
    render(<Feed auth={auth} refreshToken={0} />);
    await waitFor(() => expect(listUpdates).toHaveBeenCalled());

    const checkbox = screen.getByRole("checkbox", { name: "Show My Updates" });
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    await waitFor(() => expect(clearButton()).toBeEnabled());

    fireEvent.click(clearButton());

    expect(checkbox).not.toBeChecked();
    await waitFor(() =>
      expect(listUpdates).toHaveBeenLastCalledWith({
        status: undefined,
        author: undefined,
        sort: "newest",
      }),
    );
  });

  it("clears every filter at once", async () => {
    render(<Feed auth={auth} refreshToken={0} />);
    await waitFor(() => expect(listUpdates).toHaveBeenCalled());

    const [status, author, tag, sort] = screen.getAllByRole("combobox");
    fireEvent.change(status, { target: { value: "blocked" } });
    fireEvent.change(author, { target: { value: "u2" } });
    fireEvent.change(tag, { target: { value: "release" } });
    fireEvent.change(sort, { target: { value: "oldest" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Show My Updates" }));

    await waitFor(() => expect(clearButton()).toBeEnabled());
    fireEvent.click(clearButton());

    expect(status).toHaveValue("");
    expect(author).toHaveValue("");
    expect(tag).toHaveValue("");
    expect(sort).toHaveValue("newest");
    expect(screen.getByRole("checkbox", { name: "Show My Updates" })).not.toBeChecked();
    await waitFor(() => expect(clearButton()).toBeDisabled());
  });
});
