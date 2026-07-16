import { BeadsViewProvider, beadsViewStore } from "./store"
import { StandaloneBeadsView } from "./StandaloneBeadsView"

/** Render the standalone Beads View application. */
export function App(_props: Props) {
  return (
    <BeadsViewProvider store={beadsViewStore}>
      <StandaloneBeadsView />
    </BeadsViewProvider>
  )
}

/** Props accepted by the root application component. */
export type Props = Record<string, never>
