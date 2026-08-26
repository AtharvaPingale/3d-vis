import * as Comlink from 'comlink'
import type { StlParserWorkerApi } from './workers/stlParser.worker'

/**
 * Lazily-created singleton worker + Comlink proxy, shared by every caller
 * that needs to parse an STL off the main thread (drag & drop, the bundled
 * default model, etc.) so we don't spin up a worker per call site.
 */
let apiPromise: Comlink.Remote<StlParserWorkerApi> | null = null

function getStlParserApi(): Comlink.Remote<StlParserWorkerApi> {
  if (!apiPromise) {
    const worker = new Worker(
      new URL('./workers/stlParser.worker.ts', import.meta.url),
      { type: 'module' },
    )
    apiPromise = Comlink.wrap<StlParserWorkerApi>(worker)
  }
  return apiPromise
}

/** Parses an ArrayBuffer in the shared STL worker, transferring it in rather than cloning. */
export function parseStlBuffer(buffer: ArrayBuffer) {
  const api = getStlParserApi()
  return api.parse(Comlink.transfer(buffer, [buffer]))
}
