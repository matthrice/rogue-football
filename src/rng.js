// Small random helpers. Not seeded for now — kept simple.

export function rand() {
  return Math.random();
}

// Integer in [min, max] inclusive.
export function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// Random float in [min, max).
export function randFloat(min, max) {
  return min + Math.random() * (max - min);
}

// Pick one element uniformly.
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Pick n distinct elements (or fewer if arr is smaller).
export function pickN(arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

// True with probability p (0..1).
export function chance(p) {
  return Math.random() < p;
}

// Weighted pick. items: [{ value, weight }] -> value.
export function weighted(items) {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it.value;
  }
  return items[items.length - 1].value;
}
