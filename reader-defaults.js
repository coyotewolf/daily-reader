// First-visit reader defaults. Existing user preferences always win.
if (localStorage.getItem("pathnotes-font") === null) {
  state.fontScale = 0.8;
  applySettings();
}
