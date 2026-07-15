import { Schema } from "effect"

import { BdOutputError } from "./errors.js"

/** Parse and validate JSON emitted by the Beads CLI. */
export function parseBdJson<Type, Encoded>(
  /** Schema for the expected command response. */
  schema: Schema.Schema<Type, Encoded, never>,
  /** Raw standard output from the command. */
  output: string,
): Type {
  try {
    return Schema.decodeUnknownSync(schema)(JSON.parse(output))
  } catch (cause) {
    throw new BdOutputError(output, cause)
  }
}
