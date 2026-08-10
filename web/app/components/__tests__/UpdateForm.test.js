import { render, screen, fireEvent } from "@testing-library/react";
import UpdateForm from "../UpdateForm";
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
