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
