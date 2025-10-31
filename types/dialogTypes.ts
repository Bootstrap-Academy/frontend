export interface DialogButton {
  label: string;
  onclick: () => void;
}

export interface DialogProps {
  type?: 'info' | 'success' | 'error' | 'warning';
  heading?: string;
  body?: string;
  primaryBtn?: DialogButton;
  secondaryBtn?: DialogButton;
}