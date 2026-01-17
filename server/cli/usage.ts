/**
 * Output stream interface for printing usage.
 */
interface OutputStream {
  write: (chunk: string) => void
}

/**
 * Print CLI usage to a stream-like target.
 */
export function printUsage(out_stream: OutputStream): void {
  const lines = [
    "Usage: bdui <command> [options]",
    "",
    "Commands:",
    "  start       Start the UI server",
    "  stop        Stop the UI server",
    "  restart     Restart the UI server",
    "",
    "Options:",
    "  -h, --help        Show this help message",
    "  -d, --debug       Enable debug logging",
    "      --open        Open the browser after start/restart",
    "      --host <addr> Bind to a specific host (default: 127.0.0.1)",
    "      --port <num>  Bind to a specific port (default: 3000)",
    "",
  ]
  for (const line of lines) {
    out_stream.write(line + "\n")
  }
}
