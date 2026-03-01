/**
 * Tests for TimeControlSelector component
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimeControlSelector from '../TimeControlSelector';
import { TimeControlConfig } from '@chess-arena/shared/types/time-control.types';

describe('TimeControlSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render category tabs', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      expect(screen.getByTestId('category-tab-bullet')).toBeInTheDocument();
      expect(screen.getByTestId('category-tab-blitz')).toBeInTheDocument();
      expect(screen.getByTestId('category-tab-rapid')).toBeInTheDocument();
      expect(screen.getByTestId('category-tab-classical')).toBeInTheDocument();
    });

    it('should render custom tab when allowCustom is true', () => {
      render(<TimeControlSelector onChange={mockOnChange} allowCustom={true} />);

      expect(screen.getByTestId('category-tab-custom')).toBeInTheDocument();
    });

    it('should not render custom tab when allowCustom is false', () => {
      render(<TimeControlSelector onChange={mockOnChange} allowCustom={false} />);

      expect(screen.queryByTestId('category-tab-custom')).not.toBeInTheDocument();
    });

    it('should render blitz category by default', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      expect(screen.getByText(/Quick games between 3-10 minutes/i)).toBeInTheDocument();
    });
  });

  describe('Bullet Time Controls (Requirement 5.1)', () => {
    it('should display all bullet time controls', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-bullet'));

      expect(screen.getByTestId('time-control-bullet-1+0')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-bullet-1+1')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-bullet-2+1')).toBeInTheDocument();
    });

    it('should select bullet 1+0 time control', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-bullet'));
      fireEvent.click(screen.getByTestId('time-control-bullet-1+0'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          baseTimeMinutes: 1,
          incrementSeconds: 0,
          category: 'bullet',
        })
      );
    });

    it('should select bullet 1+1 time control', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-bullet'));
      fireEvent.click(screen.getByTestId('time-control-bullet-1+1'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          baseTimeMinutes: 1,
          incrementSeconds: 1,
          category: 'bullet',
        })
      );
    });

    it('should select bullet 2+1 time control', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-bullet'));
      fireEvent.click(screen.getByTestId('time-control-bullet-2+1'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          baseTimeMinutes: 2,
          incrementSeconds: 1,
          category: 'bullet',
        })
      );
    });
  });

  describe('Blitz Time Controls (Requirement 5.2)', () => {
    it('should display all blitz time controls', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      // Blitz is default category
      expect(screen.getByTestId('time-control-blitz-3+0')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-blitz-3+2')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-blitz-5+0')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-blitz-5+3')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-blitz-5+5')).toBeInTheDocument();
    });

    it('should select blitz 3+0 time control', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('time-control-blitz-3+0'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          baseTimeMinutes: 3,
          incrementSeconds: 0,
          category: 'blitz',
        })
      );
    });

    it('should select blitz 5+3 time control', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('time-control-blitz-5+3'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          baseTimeMinutes: 5,
          incrementSeconds: 3,
          category: 'blitz',
        })
      );
    });
  });

  describe('Rapid Time Controls (Requirement 5.3)', () => {
    it('should display all rapid time controls', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-rapid'));

      expect(screen.getByTestId('time-control-rapid-10+0')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-rapid-10+5')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-rapid-15+10')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-rapid-15+15')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-rapid-20+0')).toBeInTheDocument();
    });

    it('should select rapid 10+5 time control', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-rapid'));
      fireEvent.click(screen.getByTestId('time-control-rapid-10+5'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          baseTimeMinutes: 10,
          incrementSeconds: 5,
          category: 'rapid',
        })
      );
    });

    it('should select rapid 15+10 time control', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-rapid'));
      fireEvent.click(screen.getByTestId('time-control-rapid-15+10'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          baseTimeMinutes: 15,
          incrementSeconds: 10,
          category: 'rapid',
        })
      );
    });
  });

  describe('Classical Time Controls (Requirement 5.4)', () => {
    it('should display all classical time controls', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-classical'));

      expect(screen.getByTestId('time-control-classical-30+0')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-classical-30+20')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-classical-45+45')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-classical-60+30')).toBeInTheDocument();
      expect(screen.getByTestId('time-control-classical-90+30')).toBeInTheDocument();
    });

    it('should select classical 30+20 time control', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-classical'));
      fireEvent.click(screen.getByTestId('time-control-classical-30+20'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          baseTimeMinutes: 30,
          incrementSeconds: 20,
          category: 'classical',
        })
      );
    });

    it('should select classical 90+30 time control', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-classical'));
      fireEvent.click(screen.getByTestId('time-control-classical-90+30'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          baseTimeMinutes: 90,
          incrementSeconds: 30,
          category: 'classical',
        })
      );
    });
  });

  describe('Custom Time Controls (Requirement 5.5)', () => {
    it('should show custom form when custom tab is clicked', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-custom'));

      expect(screen.getByTestId('custom-time-control-form')).toBeInTheDocument();
      expect(screen.getByTestId('custom-base-time-input')).toBeInTheDocument();
      expect(screen.getByTestId('custom-increment-input')).toBeInTheDocument();
    });

    it('should create custom time control with valid inputs', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-custom'));

      const baseTimeInput = screen.getByTestId('custom-base-time-input');
      const incrementInput = screen.getByTestId('custom-increment-input');

      fireEvent.change(baseTimeInput, { target: { value: '7' } });
      fireEvent.change(incrementInput, { target: { value: '5' } });

      fireEvent.click(screen.getByTestId('custom-submit-button'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          baseTimeMinutes: 7,
          incrementSeconds: 5,
          isPredefined: false,
        })
      );
    });

    it('should show error for invalid base time (too low)', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-custom'));

      const baseTimeInput = screen.getByTestId('custom-base-time-input');
      fireEvent.change(baseTimeInput, { target: { value: '0.25' } });

      fireEvent.click(screen.getByTestId('custom-submit-button'));

      expect(screen.getByTestId('custom-error-message')).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should show error for invalid base time (too high)', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-custom'));

      const baseTimeInput = screen.getByTestId('custom-base-time-input');
      fireEvent.change(baseTimeInput, { target: { value: '200' } });

      fireEvent.click(screen.getByTestId('custom-submit-button'));

      expect(screen.getByTestId('custom-error-message')).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should show error for invalid increment (too high)', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-custom'));

      const incrementInput = screen.getByTestId('custom-increment-input');
      fireEvent.change(incrementInput, { target: { value: '200' } });

      fireEvent.click(screen.getByTestId('custom-submit-button'));

      expect(screen.getByTestId('custom-error-message')).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should cancel custom form', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-custom'));
      expect(screen.getByTestId('custom-time-control-form')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('custom-cancel-button'));

      expect(screen.queryByTestId('custom-time-control-form')).not.toBeInTheDocument();
    });

    it('should clear error when input changes', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-custom'));

      const baseTimeInput = screen.getByTestId('custom-base-time-input');
      fireEvent.change(baseTimeInput, { target: { value: '0.25' } });
      fireEvent.click(screen.getByTestId('custom-submit-button'));

      expect(screen.getByTestId('custom-error-message')).toBeInTheDocument();

      fireEvent.change(baseTimeInput, { target: { value: '5' } });

      expect(screen.queryByTestId('custom-error-message')).not.toBeInTheDocument();
    });
  });

  describe('Selected Value Display', () => {
    it('should highlight selected time control', () => {
      const selectedTimeControl: TimeControlConfig = {
        id: 'blitz-5+3',
        name: 'Blitz 5+3',
        category: 'blitz',
        baseTimeMinutes: 5,
        incrementSeconds: 3,
        totalTimeMs: 300000,
        isPredefined: true,
        displayFormat: '5+3',
      };

      render(<TimeControlSelector onChange={mockOnChange} value={selectedTimeControl} />);

      const selectedButton = screen.getByTestId('time-control-blitz-5+3');
      expect(selectedButton).toHaveClass('border-blue-500');
    });

    it('should display selected time control info', () => {
      const selectedTimeControl: TimeControlConfig = {
        id: 'blitz-5+3',
        name: 'Blitz 5+3',
        category: 'blitz',
        baseTimeMinutes: 5,
        incrementSeconds: 3,
        totalTimeMs: 300000,
        isPredefined: true,
        displayFormat: '5+3',
      };

      render(<TimeControlSelector onChange={mockOnChange} value={selectedTimeControl} />);

      expect(screen.getByTestId('selected-time-control')).toHaveTextContent('Blitz 5+3 (5+3)');
    });
  });

  describe('Category Switching', () => {
    it('should switch between categories', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      // Start with blitz
      expect(screen.getByTestId('time-control-blitz-5+3')).toBeInTheDocument();

      // Switch to rapid
      fireEvent.click(screen.getByTestId('category-tab-rapid'));
      expect(screen.getByTestId('time-control-rapid-10+5')).toBeInTheDocument();
      expect(screen.queryByTestId('time-control-blitz-5+3')).not.toBeInTheDocument();

      // Switch to bullet
      fireEvent.click(screen.getByTestId('category-tab-bullet'));
      expect(screen.getByTestId('time-control-bullet-1+0')).toBeInTheDocument();
      expect(screen.queryByTestId('time-control-rapid-10+5')).not.toBeInTheDocument();
    });

    it('should hide custom form when switching to predefined category', () => {
      render(<TimeControlSelector onChange={mockOnChange} />);

      fireEvent.click(screen.getByTestId('category-tab-custom'));
      expect(screen.getByTestId('custom-time-control-form')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('category-tab-bullet'));
      expect(screen.queryByTestId('custom-time-control-form')).not.toBeInTheDocument();
    });
  });
});
