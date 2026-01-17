import { html, render } from "lit-html"
import type { Store, ViewName } from "../state.js"
import { debug } from "../utils/logging.js"

/**
 * Router interface for navigation.
 */
interface Router {
  gotoView: (v: ViewName) => void
}

/**
 * View API returned by createTopNav.
 */
export interface TopNavAPI {
  destroy: () => void
}

/**
 * Render the top navigation with three tabs and handle route changes.
 *
 * @param mount_element - Element to render into.
 * @param store - Application state store.
 * @param router - Router for navigation.
 * @returns View API with destroy method.
 */
export function createTopNav(mount_element: HTMLElement, store: Store, router: Router): TopNavAPI {
  const log = debug("views:nav")
  let unsubscribe: (() => void) | null = null

  /**
   * Create click handler for tab navigation.
   *
   * @param view - View to navigate to.
   * @returns Click handler function.
   */
  function onClick(view: ViewName): (ev: MouseEvent) => void {
    return (ev: MouseEvent): void => {
      ev.preventDefault()
      log("click tab %s", view)
      router.gotoView(view)
    }
  }

  function template() {
    const s = store.getState()
    const active = s.view || "issues"
    return html`
      <nav class="header-nav" aria-label="Primary">
        <a
          href="#/issues"
          class="tab ${active === "issues" ? "active" : ""}"
          @click=${onClick("issues")}
          >Issues</a
        >
        <a
          href="#/epics"
          class="tab ${active === "epics" ? "active" : ""}"
          @click=${onClick("epics")}
          >Epics</a
        >
        <a
          href="#/board"
          class="tab ${active === "board" ? "active" : ""}"
          @click=${onClick("board")}
          >Board</a
        >
      </nav>
    `
  }

  function doRender(): void {
    render(template(), mount_element)
  }

  doRender()
  unsubscribe = store.subscribe(() => doRender())

  return {
    destroy(): void {
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
      render(html``, mount_element)
    },
  }
}
