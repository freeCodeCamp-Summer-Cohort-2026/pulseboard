import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Feed from "../Feed";
import { listUpdates } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  listUpdates: jest.fn(),
}));

jest.mock("../UpdateCard", () => {
  return function MockUpdateCard({ update }) {
    return <div>{update.text}</div>;
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

describe("Feed - manual refresh", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("refreshes the feed using the currently selected filters and sort", async () => {
    const existingUpdates = [
      {
        _id: "update-1",
        text: "Existing update",
        status: "done",
        author: {
          _id: "u1",
          displayName: "Diego Fernandez",
        },
      },
    ];

    listUpdates.mockImplementation(({ status } = {}) => {
      if (status === "blocked") {
        return Promise.resolve({
          updates: [],
          pagination: {
            hasNextPage: false,
          },
        });
      }

      return Promise.resolve({
        updates: existingUpdates,
        pagination: {
          hasNextPage: false,
        },
      });
    });

    render(<Feed auth={null} refreshToken={0} />);

    await screen.findByText("Existing update");

    const statusSelect = screen.getAllByRole("combobox")[0];

    fireEvent.change(statusSelect, {
      target: { value: "blocked" },
    });

    const sortSelect = screen.getAllByRole("combobox")[3];

    fireEvent.change(sortSelect, {
      target: { value: "oldest" },
    });

    await waitFor(() => {
      expect(listUpdates).toHaveBeenLastCalledWith({
        status: "blocked",
        author: undefined,
        sort: "oldest",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(listUpdates).toHaveBeenLastCalledWith({
        status: "blocked",
        author: undefined,
        sort: "oldest",
      });
    });

    expect(statusSelect).toHaveValue("blocked");
    expect(sortSelect).toHaveValue("oldest");
  });

  it("keeps existing updates visible while refreshing", async () => {
    let resolveRefresh;
    let callCount = 0;

    listUpdates.mockImplementation(() => {
      callCount += 1;

      if (callCount <= 2) {
        return Promise.resolve({
          updates: [
            {
              _id: "update-1",
              text: "Existing update",
            },
          ],
          pagination: {
            hasNextPage: false,
          },
        });
      }

      return new Promise((resolve) => {
        resolveRefresh = resolve;
      });
    });

    render(<Feed auth={null} refreshToken={0} />);

    expect(await screen.findByText("Existing update")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(
      screen.getByRole("button", { name: "Refreshing..." }),
    ).toBeDisabled();

    expect(screen.getByText("Existing update")).toBeInTheDocument();

    resolveRefresh({
      updates: [
        {
          _id: "update-2",
          text: "Refreshed update",
        },
      ],
      pagination: {
        hasNextPage: false,
      },
    });

    expect(await screen.findByText("Refreshed update")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
  });
});

describe("Feed - empty state", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows a no-updates message when there are no updates", async () => {
    listUpdates.mockResolvedValue({
      updates: [],
      pagination: {
        hasNextPage: false,
      },
    });

    render(<Feed auth={null} refreshToken={0} />);

    expect(await screen.findByText("No updates yet.")).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  it("shows the active filter when it produces no results", async () => {
    const existingUpdates = [
      {
        _id: "update-1",
        status: "done",
        author: {
          _id: "u1",
          displayName: "Diego Fernandez",
        },
        tags: ["frontend"],
      },
    ];

    listUpdates.mockImplementation(({ status } = {}) => {
      if (status === "blocked") {
        return Promise.resolve({
          updates: [],
          pagination: {
            hasNextPage: false,
          },
        });
      }

      return Promise.resolve({
        updates: existingUpdates,
        pagination: {
          hasNextPage: false,
        },
      });
    });

    render(<Feed auth={null} refreshToken={0} />);

    const statusSelect = screen.getAllByRole("combobox")[0];

    fireEvent.change(statusSelect, {
      target: { value: "blocked" },
    });

    expect(
      await screen.findByText("No updates match your filters."),
    ).toBeInTheDocument();

    expect(screen.getByText("Status: blocked")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Clear filters" }),
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
