import * as Comlink from 'comlink'
import type { GcodeParserWorkerApi } from './workers/gcodeParser.worker'

let apiPromise: Comlink.Remote<GcodeParserWorkerApi> | null = null

function getGcodeParserApi(): Comlink.Remote<GcodeParserWorkerApi> {
  if (!apiPromise) {
    const worker = new Worker(
      new URL('./workers/gcodeParser.worker.ts', import.meta.url),
      { type: 'module' },
    )
    apiPromise = Comlink.wrap<GcodeParserWorkerApi>(worker)
  }
  return apiPromise
}

/** Parses a G-code ArrayBuffer in the shared worker, reporting 0–1 progress as it goes. */
export function parseGcodeBuffer(buffer: ArrayBuffer, onProgress: (fraction: number) => void) {
  const api = getGcodeParserApi()
  return api.parse(Comlink.transfer(buffer, [buffer]), Comlink.proxy(onProgress))
}
