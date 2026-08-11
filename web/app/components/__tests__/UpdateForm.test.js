import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UpdateForm from '../UpdateForm';
import { createUpdate } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  createUpdate: jest.fn(),
}));

const auth = {
  token: 'test-token',
};

describe('UpdateForm loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables the form while posting and re-enables it after success', async () => {
    let resolveRequest;

    createUpdate.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    const onPosted = jest.fn();

    render(<UpdateForm auth={auth} onPosted={onPosted} />);

    const textarea = screen.getByPlaceholderText(/what's your status today/i);
    const select = screen.getByRole('combobox');
    const button = screen.getByRole('button', { name: /post update/i });

    fireEvent.change(textarea, {
      target: { value: 'Working on tests' },
    });

    fireEvent.click(button);

    // Loading state should disable the form
    expect(button).toBeDisabled();
    expect(textarea).toBeDisabled();
    expect(select).toBeDisabled();
    expect(screen.getByText(/posting/i)).toBeInTheDocument();

    // Resolve the pending request
    resolveRequest({
      update: {
        id: '1',
        text: 'Working on tests',
        status: 'on-track',
      },
    });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    expect(textarea).not.toBeDisabled();
    expect(select).not.toBeDisabled();
    expect(onPosted).toHaveBeenCalled();
  });

  it('re-enables the form and shows an error after failure', async () => {
    createUpdate.mockRejectedValue(new Error('Network error'));

    render(<UpdateForm auth={auth} onPosted={jest.fn()} />);

    const textarea = screen.getByPlaceholderText(/what's your status today/i);
    const button = screen.getByRole('button', { name: /post update/i });

    fireEvent.change(textarea, {
      target: { value: 'This will fail' },
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    expect(textarea).not.toBeDisabled();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});