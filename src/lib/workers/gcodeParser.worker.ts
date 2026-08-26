import * as Comlink from 'comlink'
import { parseGcode } from '../parsers/gcodeParser'
import type { ParsedGcode } from '../../types/model'

const api = {
  /**
   * Parses a G-code ArrayBuffer off the main thread, decoding it to text
   * here so the (potentially huge) buffer can be transferred in rather
   * than cloned. `onProgress` is a Comlink-proxied callback the caller
   * passes in to receive 0–1 progress updates.
   */
  async parse(
    buffer: ArrayBuffer,
    onProgress?: (fraction: number) => void,
  ): Promise<ParsedGcode> {
    const text = new TextDecoder('utf-8').decode(buffer)
    return parseGcode(text, onProgress)
  },
}

export type GcodeParserWorkerApi = typeof api

Comlink.expose(api)
