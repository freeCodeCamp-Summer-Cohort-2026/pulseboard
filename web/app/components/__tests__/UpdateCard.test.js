import { render, screen, fireEvent } from "@testing-library/react";
import UpdateCard, { groupReactions } from "../UpdateCard";
import UpdateForm from "../UpdateForm";

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

    it("does not show reaction buttons when logged out", () => {
        render(<UpdateCard update={update} auth={null} onUpdated={() => {}} />);

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
});

describe("CountCharacters", () => {
    it("puts characters into the form's field", () => {
        render(<UpdateForm auth={{ token: "x" }} onPosted={() => {}} />);

        fireEvent.change(
            screen.getByPlaceholderText("What's your status today?"),
            {
                target: { value: "Test Status!" },
            },
        );

        expect(screen.getByText("12/1000")).toBeInTheDocument();
    });
});
