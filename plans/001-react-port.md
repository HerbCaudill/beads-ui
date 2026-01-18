# React Migration Plan for beads-ui

Incremental migration from lit-html to React with Vite and Zustand.

## Decisions

- **Build**: Vite (replaces esbuild)
- **State**: Zustand (replaces custom store)
- **Migration**: Incremental (lit-html + React coexist)
- **Styling**: Keep CSS custom properties
- **Router**: Keep hash router, adapt for React

## Phase 1: Infrastructure Setup

### 1.1 Add dependencies

```bash
pnpm add react react-dom zustand
pnpm add -D @vitejs/plugin-react @types/react @types/react-dom vite @testing-library/react
```

### 1.2 Create Vite config

Create `vite.config.ts` at project root:

- Configure React plugin
- Set root to `app/`
- Proxy WebSocket to dev server

### 1.3 Update entry point

- Rename `app/main.ts` → `app/main-lit.ts` (keep lit-html bootstrap)
- Create `app/main.tsx` as new entry that imports and runs lit-html bootstrap
- Update `app/index.html` to load `/main.tsx`
- Add `<div id="react-root">` mount point

### 1.4 Update package.json scripts

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

## Phase 2: Zustand Store with Bridge

### 2.1 Create Zustand store

Create `app/store/index.ts`:

- Mirror `AppState` interface from `state.ts`
- Use `subscribeWithSelector` middleware
- Export typed `useAppStore` hook

### 2.2 Create lit-html adapter

Create `app/store/lit-adapter.ts`:

- Implements existing `Store` interface
- Wraps Zustand getState/setState/subscribe
- Allows lit-html views to use Zustand without changes

### 2.3 Wire adapter in main-lit.ts

Replace `createStore()` with `createLitStoreAdapter()`.

## Phase 3: Data Layer Hooks

### 3.1 Create React hooks for data subscriptions

- `app/hooks/useIssueStores.ts` - wraps `subscription-issue-stores` with `useSyncExternalStore`
- `app/hooks/useListSelectors.ts` - wraps `list-selectors` for filtered/sorted data
- `app/hooks/useTransport.ts` - provides WebSocket send function

### 3.2 Set global instances from bootstrap

Export setter functions that `main-lit.ts` calls after creating instances:

- `setIssueStoresInstance()`
- `setSelectorsInstance()`
- `setTransportFn()`

## Phase 4: React Root and Portal Bridge

### 4.1 Create React app shell

Create `app/components/App.tsx`:

- Mounts React root
- Uses portals to render into existing DOM sections
- Conditionally renders migrated views

### 4.2 Mount React alongside lit-html

In `main.tsx`:

- Import and call `bootstrap()` from `main-lit.ts`
- Create React root and render `<App />`

## Phase 5: Migrate Views (order: Epics → Board → List → Detail)

### 5.1 Epics View (~320 lines)

**Files to create:**

- `app/components/EpicsView.tsx`
- `app/components/EpicGroup.tsx`
- `app/components/EpicsView.test.tsx`

**Approach:**

1. Port `views/epics.ts` template logic to JSX
2. Use `useAppStore` for state
3. Use `useIssueSnapshot('tab:epics')` for data
4. Use `useTransport` for mutations
5. Render via portal into `#epics-root`
6. Remove lit-html render call from `main-lit.ts` when complete

### 5.2 Board View (~635 lines)

**Files to create:**

- `app/components/BoardView.tsx`
- `app/components/BoardColumn.tsx`
- `app/components/BoardCard.tsx`
- `app/components/BoardView.test.tsx`

**Approach:**

1. Port drag-and-drop using HTML5 drag events (same as current)
2. Use `useBoardColumn()` hook for each column's data
3. Handle closed filter from Zustand store

### 5.3 List View (~575 lines)

**Files to create:**

- `app/components/ListView.tsx`
- `app/components/IssueRow.tsx`
- `app/components/FilterBar.tsx`
- `app/components/ListView.test.tsx`

**Approach:**

1. Port table rendering and inline editing
2. Filters managed by Zustand
3. Keyboard navigation via React event handlers

### 5.4 Detail View (~1500 lines)

**Files to create:**

- `app/components/DetailView.tsx`
- `app/components/DetailHeader.tsx`
- `app/components/DetailFields.tsx`
- `app/components/CommentSection.tsx`
- `app/components/DependencyList.tsx`
- `app/components/DetailView.test.tsx`

**Approach:**

1. Keep using native `<dialog>` element
2. Port field editors (title, description, priority, etc.)
3. Comments and dependencies as sub-components

## Phase 6: Shared Components

### 6.1 UI primitives

Create `app/components/ui/`:

- `PriorityBadge.tsx`
- `StatusBadge.tsx`
- `TypeBadge.tsx`
- `IssueIdLink.tsx`
- `Toast.tsx`

### 6.2 Dialogs

- `NewIssueDialog.tsx` (port from `views/new-issue-dialog.ts`)
- `IssueDialog.tsx` (port from `views/issue-dialog.ts`)

## Phase 7: Cleanup

After all views migrated:

1. Remove `lit-html` dependency
2. Delete `app/views/` directory
3. Delete `app/state.ts` (replaced by Zustand)
4. Rename `app/main-lit.ts` back to `app/main.ts` or consolidate into `main.tsx`
5. Delete `scripts/build-frontend.ts`
6. Update vitest config for React testing

## File Structure (Final)

```
app/
  components/
    ui/
      PriorityBadge.tsx
      StatusBadge.tsx
      TypeBadge.tsx
      IssueIdLink.tsx
      Toast.tsx
    App.tsx
    BoardView.tsx
    BoardColumn.tsx
    BoardCard.tsx
    DetailView.tsx
    EpicsView.tsx
    EpicGroup.tsx
    ListView.tsx
    IssueRow.tsx
    FilterBar.tsx
    NewIssueDialog.tsx
    ...
  hooks/
    useIssueStores.ts
    useListSelectors.ts
    useTransport.ts
  store/
    index.ts
  data/           # Keep existing
  utils/          # Keep existing
  main.tsx
  index.html
vite.config.ts
```

## Testing Strategy

- Add `@testing-library/react` for React component tests
- React tests use `.test.tsx` extension
- Keep existing Vitest setup, add React project
- Test each view after migration before moving to next

## Verification

After each phase:

1. Run `pnpm dev` and verify app loads
2. Run `pnpm test` to ensure no regressions
3. Manually test the migrated view alongside existing lit-html views
4. Verify WebSocket subscriptions work correctly
