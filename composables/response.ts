import { useState } from "#app";

export const useLoading = () => useState("loading", () => false);

export function setLoading(status: boolean) {
  const loading = useLoading();
  loading.value = status;
}

export const useSnackbar = () =>
  useState("snackbar", (): any => {
    return {
      show: false,
      type: "info",
      heading: "",
      body: "",
      params: {},
    };
  });

/**
 * `params` are handed to `t()` together with the heading and the body, so a
 * message can name a value that is read from the API instead of repeating it
 * in the locale file.
 */
export function openSnackbar(
  type: string,
  heading: string,
  body: string = "",
  noTimeout?: boolean,
  params: Record<string, any> = {}
) {
  const snackbar = useSnackbar();
  snackbar.value = {
    show: true,
    type,
    heading,
    body,
    params,
  };

  if (!!!noTimeout) {
    setTimeout(() => {
      closeSnackbar();
    }, 5000);
  }
}

export function closeSnackbar() {
  const snackbar = useSnackbar();
  snackbar.value = {
    show: false,
    type: "info",
    heading: "",
    body: "",
    params: {},
  };
}

export const useDialog = () =>
  useState("dialog", (): any => {
    return null;
  });

/**
 * `bodyLink` turns the `%%%` placeholder of the body into a link, which is how
 * a dialog can point at a contact address or a document.
 */
export function openDialog(
  type: string,
  heading: string,
  body: string,
  triggerPrimaryActionOnBackdropClick: boolean,
  primaryBtn: any,
  secondaryBtn: any,
  bodyLink: { href: string; label: string } | null = null
) {
  const dialog = useDialog();
  dialog.value = {
    show: true,
    type,
    heading,
    body,
    triggerPrimaryActionOnBackdropClick,
    primaryBtn,
    secondaryBtn,
    bodyLink,
  };
}

export function closeDialog() {
  const dialog = useDialog();
  dialog.value = null;
}
