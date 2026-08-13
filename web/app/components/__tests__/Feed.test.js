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
