export function setNativeCursorHidden(canvas, hidden) {
  canvas.classList.toggle('native-cursor-hidden', hidden);
  canvas.ownerDocument.documentElement.classList.toggle('native-cursor-hidden', hidden);
}
