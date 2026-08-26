import * as Comlink from 'comlink'
import { parseSTL } from '../parsers/stlParser'
import type { ParsedSTL } from '../../types/model'

const api = {
  /**
   * Parses an STL ArrayBuffer off the main thread. The caller should mark
   * `buffer` as a Transferable when invoking this so the (potentially large)
   * file data is moved rather than structured-cloned into the worker.
   */
  parse(buffer: ArrayBuffer): ParsedSTL {
    return parseSTL(buffer)
  },
}

export type StlParserWorkerApi = typeof api

Comlink.expose(api)
