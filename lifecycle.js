export function createLifecycle() {
  let focused = true;
  let visible = true;
  return {
    setFocused(value) { focused = Boolean(value); },
    setVisible(value) { visible = Boolean(value); },
    canAdvance() { return focused && visible; },
    audioShouldRun(running, soundOn) { return focused && visible && running && soundOn; },
  };
}
