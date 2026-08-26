import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { parseGcodeBuffer } from '../../lib/gcodeWorkerClient'
import { parseStlBuffer } from '../../lib/stlWorkerClient'
import { useGcodeStore } from '../../store/gcodeStore'
import { useViewerStore } from '../../store/viewerStore'

const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024 // 250MB, per PLAN.md open question

const GCODE_EXTENSIONS = ['.gcode', '.gco', '.g']

type FileKind = 'stl' | 'gcode' | null

/** Extension is the primary gate — STL/G-code have no reliable shared magic number to sniff. */
function detectFileKind(fileName: string): FileKind {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.stl')) return 'stl'
  if (GCODE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'gcode'
  return null
}

export function Dropzone() {
  const setStlLoading = useViewerStore((s) => s.setLoading)
  const setStlModel = useViewerStore((s) => s.setModel)
  const setStlError = useViewerStore((s) => s.setError)

  const setGcodeLoading = useGcodeStore((s) => s.setLoading)
  const setGcodeProgress = useGcodeStore((s) => s.setProgress)
  const setGcodeData = useGcodeStore((s) => s.setData)
  const setGcodeError = useGcodeStore((s) => s.setError)

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: { file: File }[]) => {
      if (fileRejections.length > 0 && acceptedFiles.length === 0) {
        setStlError('Please drop a single .stl or .gcode file.')
        return
      }

      const file = acceptedFiles[0]
      if (!file) return

      const kind = detectFileKind(file.name)
      if (!kind) {
        setStlError(`"${file.name}" doesn't look like an .stl or .gcode file.`)
        return
      }
      if (file.size === 0) {
        setStlError(`"${file.name}" is empty.`)
        return
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setStlError(
          `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(0)}MB, over the ${
            MAX_FILE_SIZE_BYTES / 1024 / 1024
          }MB limit.`,
        )
        return
      }

      if (kind === 'stl') {
        setStlLoading(file.name)
        try {
          const buffer = await file.arrayBuffer()
          const parsed = await parseStlBuffer(buffer)
          setStlModel(parsed)
        } catch (err) {
          setStlError(
            err instanceof Error
              ? `Failed to parse "${file.name}": ${err.message}`
              : `Failed to parse "${file.name}".`,
          )
        }
        return
      }

      setGcodeLoading(file.name)
      try {
        const buffer = await file.arrayBuffer()
        const parsed = await parseGcodeBuffer(buffer, setGcodeProgress)
        setGcodeData(parsed)
      } catch (err) {
        setGcodeError(
          err instanceof Error
            ? `Failed to parse "${file.name}": ${err.message}`
            : `Failed to parse "${file.name}".`,
        )
      }
    },
    [
      setStlLoading,
      setStlModel,
      setStlError,
      setGcodeLoading,
      setGcodeProgress,
      setGcodeData,
      setGcodeError,
    ],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'model/stl': ['.stl'],
      'application/sla': ['.stl'],
      'text/x-gcode': ['.gcode', '.gco', '.g'],
    },
    maxFiles: 1,
    multiple: false,
  })

  return (
    <div
      {...getRootProps()}
      className={`flex h-64 w-full max-w-xl cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        isDragActive
          ? 'border-sky-400 bg-sky-950/30'
          : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
      }`}
    >
      <input {...getInputProps()} />
      <p className="text-lg font-medium text-slate-200">
        {isDragActive ? 'Drop the file here' : 'Drag & drop an STL or G-code file'}
      </p>
      <p className="text-sm text-slate-400">or click to browse — up to 250MB</p>
    </div>
  )
}
