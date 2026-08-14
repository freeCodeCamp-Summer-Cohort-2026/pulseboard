import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPanel from '../AuthPanel';

// Mock the API module
jest.mock('@/lib/api', () => ({
  login: jest.fn(),
  register: jest.fn(),
}));

// Import the mocked modules
import { register } from '@/lib/api';

describe('AuthPanel - Password Confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows error and does not call API when passwords do not match', async () => {
    render(<AuthPanel auth={null} onSignIn={() => {}} onSignOut={() => {}} />);
    
    // Switch to register mode
    const registerTab = screen.getByText('Register');
    fireEvent.click(registerTab);
    
    // Fill in form with mismatched passwords
    fireEvent.change(screen.getByPlaceholderText('Display name'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('confirm password'), {
      target: { value: 'password456' },
    });
    
    // Submit the form
    const submitButton = screen.getByText('Create account');
    fireEvent.click(submitButton);
    
    // Check error message appears
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    
    // Verify API was NOT called
    expect(register).not.toHaveBeenCalled();
  });

  test('calls API when passwords match', async () => {
    // Mock successful registration
    register.mockResolvedValue({ user: { displayName: 'Test User' } });
    
    render(<AuthPanel auth={null} onSignIn={() => {}} onSignOut={() => {}} />);
    
    // Switch to register mode
    const registerTab = screen.getByText('Register');
    fireEvent.click(registerTab);
    
    // Fill in form with matching passwords
    fireEvent.change(screen.getByPlaceholderText('Display name'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('confirm password'), {
      target: { value: 'password123' },
    });
    
    // Submit the form
    const submitButton = screen.getByText('Create account');
    fireEvent.click(submitButton);
    
    // Verify API was called with correct data
    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });
    });
  });
});