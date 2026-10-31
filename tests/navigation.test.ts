// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test } from 'vitest';
import { attachProjectNavigation } from '../src/projects/navigation';

let complete: () => void;
const destinations: string[] = [];
let removeNavigation: (() => void) | undefined;

function setup(reduced = false) {
  document.body.innerHTML = '<nav><a class="project-block" href="/projects/example.html" style="--block-color: #cb2f2c"><span>Example</span></a></nav>';
  removeNavigation = attachProjectNavigation(document.querySelector('nav')!, {
    motionQuery: { matches: reduced } as MediaQueryList,
    navigate: url => destinations.push(url),
  });
  return document.querySelector('a')!;
}

function click(element: Element, options: MouseEventInit = {}) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...options });
  element.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  destinations.length = 0;
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: () => ({
      finished: new Promise<void>(resolve => { complete = resolve; }),
      cancel() {},
    }),
  });
});

afterEach(() => {
  removeNavigation?.();
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
});

test('fades_to_the_clicked_color_before_following_the_link_once', async () => {
  const anchor = setup();
  const event = click(anchor.querySelector('span')!);
  expect(event.defaultPrevented).toBe(true);
  expect(document.querySelector<HTMLElement>('.project-transition')!.style.backgroundColor).toBe('rgb(203, 47, 44)');
  expect(destinations).toEqual([]);
  click(anchor);
  complete();
  await Promise.resolve();
  expect(destinations).toEqual([anchor.href]);
});

test.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])(
  'preserves_modified_or_middle_click_%j', options => {
    const anchor = setup();
    anchor.href = '#native-click';
    expect(click(anchor, options).defaultPrevented).toBe(false);
    expect(document.querySelector('.project-transition')).toBeNull();
  },
);

test('does_not_animate_a_click_prevented_by_dragging', () => {
  const anchor = setup();
  anchor.addEventListener('click', event => event.preventDefault());
  click(anchor);
  expect(document.querySelector('.project-transition')).toBeNull();
  expect(destinations).toEqual([]);
});

test('reduced_motion_and_new_tab_links_navigate_natively', () => {
  const anchor = setup(true);
  anchor.href = '#native-click';
  expect(click(anchor).defaultPrevented).toBe(false);
  removeNavigation!();
  const newTab = setup();
  newTab.target = '_blank';
  expect(click(newTab).defaultPrevented).toBe(false);
  expect(document.querySelector('.project-transition')).toBeNull();
});

test('restoring_the_homepage_removes_the_color_cover_without_navigating_again', async () => {
  const anchor = setup();
  click(anchor);
  complete();
  await Promise.resolve();
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  expect(document.querySelector('.project-transition')).toBeNull();
  expect(destinations).toHaveLength(1);
  click(anchor);
  expect(document.querySelector('.project-transition')).not.toBeNull();
});

test('destroying_the_app_cancels_pending_navigation', async () => {
  click(setup());
  removeNavigation!();
  complete();
  await Promise.resolve();
  expect(destinations).toEqual([]);
  expect(document.querySelector('.project-transition')).toBeNull();
});
