/** Index of the first element in a non-decreasing array that is >= target (a lower bound). */
export function lowerBound(arr: ArrayLike<number>, target: number): number {
  let lo = 0
  let hi = arr.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (arr[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}
