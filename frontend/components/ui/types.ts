// Common UI component types

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type Variant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}
