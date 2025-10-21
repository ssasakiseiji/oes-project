import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
    it('renders loading spinner', () => {
        const { container } = render(<LoadingSpinner />);

        // Check if the spinner container exists
        const spinnerContainer = container.querySelector('.animate-spin');
        expect(spinnerContainer).toBeInTheDocument();
    });

    it('has correct styling classes', () => {
        const { container } = render(<LoadingSpinner />);

        const wrapper = container.firstChild;
        expect(wrapper).toHaveClass('flex', 'justify-center', 'items-center');
    });
});
