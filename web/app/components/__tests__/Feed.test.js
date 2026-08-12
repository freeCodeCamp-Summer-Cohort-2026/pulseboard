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
