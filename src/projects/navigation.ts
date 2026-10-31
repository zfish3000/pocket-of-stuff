interface NavigationOptions {
  motionQuery?: MediaQueryList;
  navigate?: (url: string) => void;
}

export function attachProjectNavigation(stage: HTMLElement, options: NavigationOptions = {}): () => void {
  const document = stage.ownerDocument;
  const window = document.defaultView!;
  const motion = options.motionQuery ?? window.matchMedia('(prefers-reduced-motion: reduce)');
  const navigate = options.navigate ?? (url => window.location.assign(url));
  let pending: { overlay: HTMLElement; animation?: Animation } | null = null;

  function clear() {
    const previous = pending;
    pending = null;
    previous?.animation?.cancel();
    previous?.overlay.remove();
  }

  function click(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a.project-block') : null;
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin || motion.matches || typeof anchor.animate !== 'function') return;

    event.preventDefault();
    if (pending) return;
    const overlay = document.createElement('div');
    overlay.className = 'project-transition';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.backgroundColor = window.getComputedStyle(anchor).getPropertyValue('--block-color').trim();
    document.body.append(overlay);
    const transition = { overlay, animation: undefined as Animation | undefined };
    pending = transition;
    const finish = () => {
      if (pending !== transition) return;
      navigate(destination.href);
    };
    try {
      transition.animation = overlay.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 220,
        easing: 'ease-in',
        fill: 'forwards',
      });
      void transition.animation.finished.then(finish, finish);
    } catch {
      clear();
      navigate(destination.href);
    }
  }

  function restore(event: PageTransitionEvent) {
    if (event.persisted) clear();
  }

  // Physics suppresses drag clicks during capture; this runs afterward in bubble.
  stage.addEventListener('click', click);
  window.addEventListener('pageshow', restore);
  return () => {
    clear();
    stage.removeEventListener('click', click);
    window.removeEventListener('pageshow', restore);
  };
}
