/**
 * QR Code encoder (ISO/IEC 18004), byte mode, error-correction level M.
 *
 * Written from scratch rather than added as a dependency, and — more importantly —
 * rather than calling a QR *service*: a deposit address is a bearer credential, and
 * sending it to a third-party image API to be rendered would leak it off-device.
 * This runs entirely in the browser, so the address never leaves the page.
 *
 * Scope is deliberately narrow, sized to what it is used for:
 *   · Byte mode only. Crypto URIs are mixed-case ASCII, so alphanumeric mode
 *     (uppercase-only) cannot encode them and the other modes are irrelevant.
 *   · Level M (~15% recovery). The level wallet apps expect for addresses.
 *   · Versions 1–10, i.e. up to 213 bytes. A `tron:T…?token=…` URI is ~60.
 *
 * Verified by `scripts/verify-qr.mjs`, which decodes the produced bitmap with an
 * independent from-scratch reader (finder location, format-info decode, unmask,
 * de-interleave, Reed–Solomon correct, bitstream parse) and asserts the original
 * string comes back — plus fault injection to prove the ECC actually recovers.
 */

/* ------------------------------------------------------- Version parameters */

type VersionSpec = {
  /** Total codewords (data + error correction). */
  totalCodewords: number;
  /** EC codewords per block, at level M. */
  ecPerBlock: number;
  /** Number of RS blocks at level M. */
  blocks: number;
  /** Row/column centres of the alignment patterns. */
  alignment: readonly number[];
};

const VERSIONS: readonly VersionSpec[] = [
  { totalCodewords: 26, ecPerBlock: 10, blocks: 1, alignment: [] },
  { totalCodewords: 44, ecPerBlock: 16, blocks: 1, alignment: [6, 18] },
  { totalCodewords: 70, ecPerBlock: 26, blocks: 1, alignment: [6, 22] },
  { totalCodewords: 100, ecPerBlock: 18, blocks: 2, alignment: [6, 26] },
  { totalCodewords: 134, ecPerBlock: 24, blocks: 2, alignment: [6, 30] },
  { totalCodewords: 172, ecPerBlock: 16, blocks: 4, alignment: [6, 34] },
  { totalCodewords: 196, ecPerBlock: 18, blocks: 4, alignment: [6, 22, 38] },
  { totalCodewords: 242, ecPerBlock: 22, blocks: 4, alignment: [6, 24, 42] },
  { totalCodewords: 292, ecPerBlock: 22, blocks: 5, alignment: [6, 26, 46] },
  { totalCodewords: 346, ecPerBlock: 26, blocks: 5, alignment: [6, 28, 50] },
];

const MAX_VERSION = VERSIONS.length;

function specFor(version: number): VersionSpec {
  return VERSIONS[version - 1];
}

function dataCodewords(version: number): number {
  const spec = specFor(version);
  return spec.totalCodewords - spec.ecPerBlock * spec.blocks;
}

/** 8 bits for versions 1–9, 16 for 10–26. Byte mode. */
function characterCountBits(version: number): number {
  return version < 10 ? 8 : 16;
}

function byteCapacity(version: number): number {
  const bits = dataCodewords(version) * 8 - 4 - characterCountBits(version);
  return Math.floor(bits / 8);
}

/* ---------------------------------------------------------- GF(256) for RS */

/** Field defined by x^8 + x^4 + x^3 + x^2 + 1 (0x11D), the QR standard. */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(function buildTables() {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** Generator polynomial for `degree` EC codewords: ∏ (x - α^i). */
function generatorPolynomial(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);

  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMultiply(poly[j], EXP[i]);
    }
    poly = next;
  }

  return poly;
}

/** Remainder of `data` · x^degree divided by the generator — the EC codewords. */
function reedSolomonRemainder(data: Uint8Array, degree: number): Uint8Array {
  const generator = generatorPolynomial(degree);
  const remainder = new Uint8Array(degree);

  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[degree - 1] = 0;
    for (let i = 0; i < degree; i += 1) {
      remainder[i] ^= gfMultiply(generator[i + 1], factor);
    }
  }

  return remainder;
}

/* ------------------------------------------------------------- Bit stream */

class BitBuffer {
  private bits: number[] = [];

  append(value: number, length: number) {
    for (let i = length - 1; i >= 0; i -= 1) {
      this.bits.push((value >>> i) & 1);
    }
  }

  get length(): number {
    return this.bits.length;
  }

  /** Pads to a byte boundary and returns the codewords. */
  toBytes(): Uint8Array {
    while (this.bits.length % 8 !== 0) this.bits.push(0);

    const bytes = new Uint8Array(this.bits.length / 8);
    this.bits.forEach((bit, index) => {
      if (bit) bytes[index >>> 3] |= 0x80 >>> (index & 7);
    });
    return bytes;
  }
}

/* ------------------------------------------------------ Codeword assembly */

function buildCodewords(data: Uint8Array, version: number): Uint8Array {
  const capacity = dataCodewords(version);
  const buffer = new BitBuffer();

  buffer.append(0b0100, 4); // byte mode
  buffer.append(data.length, characterCountBits(version));
  for (const byte of data) buffer.append(byte, 8);

  // Terminator, up to four zero bits, but never past capacity.
  const capacityBits = capacity * 8;
  buffer.append(0, Math.min(4, capacityBits - buffer.length));

  const bytes = buffer.toBytes();
  const padded = new Uint8Array(capacity);
  padded.set(bytes.subarray(0, capacity));

  // Alternating pad codewords 0xEC / 0x11, per spec.
  for (let i = bytes.length; i < capacity; i += 1) {
    padded[i] = (i - bytes.length) % 2 === 0 ? 0xec : 0x11;
  }

  return interleave(padded, version);
}

/**
 * Splits data into RS blocks, computes EC for each, and interleaves.
 *
 * Block sizes are derived rather than tabulated: `blocks` short blocks, with the
 * remainder distributed one extra codeword each. That reproduces the spec's
 * block table exactly for every version this module supports.
 */
function interleave(data: Uint8Array, version: number): Uint8Array {
  const spec = specFor(version);
  const totalData = data.length;
  const shortLength = Math.floor(totalData / spec.blocks);
  const longCount = totalData % spec.blocks;

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  let offset = 0;
  for (let i = 0; i < spec.blocks; i += 1) {
    const length = shortLength + (i >= spec.blocks - longCount ? 1 : 0);
    const block = data.subarray(offset, offset + length);
    offset += length;
    dataBlocks.push(block);
    ecBlocks.push(reedSolomonRemainder(block, spec.ecPerBlock));
  }

  const result = new Uint8Array(spec.totalCodewords);
  let cursor = 0;

  const maxDataLength = shortLength + (longCount > 0 ? 1 : 0);
  for (let i = 0; i < maxDataLength; i += 1) {
    for (const block of dataBlocks) {
      if (i < block.length) result[cursor++] = block[i];
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i += 1) {
    for (const block of ecBlocks) result[cursor++] = block[i];
  }

  return result;
}

/* ---------------------------------------------------------- Module matrix */

type Matrix = {
  size: number;
  /** 1 = dark, 0 = light. */
  modules: Uint8Array;
  /** 1 = reserved by a function pattern and not available to data. */
  reserved: Uint8Array;
};

function createMatrix(version: number): Matrix {
  const size = version * 4 + 17;
  return {
    size,
    modules: new Uint8Array(size * size),
    reserved: new Uint8Array(size * size),
  };
}

function setModule(
  matrix: Matrix,
  x: number,
  y: number,
  dark: boolean,
  reserve = true
) {
  const index = y * matrix.size + x;
  matrix.modules[index] = dark ? 1 : 0;
  if (reserve) matrix.reserved[index] = 1;
}

function isReserved(matrix: Matrix, x: number, y: number): boolean {
  return matrix.reserved[y * matrix.size + x] === 1;
}

function drawFinder(matrix: Matrix, cx: number, cy: number) {
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= matrix.size || y >= matrix.size) continue;

      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      // Concentric: dark 3x3 core, light ring, dark ring, light separator.
      setModule(matrix, x, y, distance !== 2 && distance !== 4);
    }
  }
}

function drawAlignment(matrix: Matrix, cx: number, cy: number) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setModule(matrix, cx + dx, cy + dy, distance !== 1);
    }
  }
}

function drawFunctionPatterns(matrix: Matrix, version: number) {
  const last = matrix.size - 1;

  drawFinder(matrix, 3, 3);
  drawFinder(matrix, last - 3, 3);
  drawFinder(matrix, 3, last - 3);

  // Timing patterns along row and column 6.
  for (let i = 8; i < matrix.size - 8; i += 1) {
    const dark = i % 2 === 0;
    setModule(matrix, i, 6, dark);
    setModule(matrix, 6, i, dark);
  }

  // Alignment patterns at every centre pair except those under a finder.
  const centres = specFor(version).alignment;
  for (const cy of centres) {
    for (const cx of centres) {
      const nearFinder =
        (cx === 6 && cy === 6) ||
        (cx === 6 && cy === last - 6) ||
        (cx === last - 6 && cy === 6);
      if (!nearFinder) drawAlignment(matrix, cx, cy);
    }
  }

  // Reserve the format-information areas by writing a placeholder through the
  // same routine that writes the real values. Reserving by hand would be easy to
  // get wrong: the format region skips index 6 on both axes, which is where the
  // timing patterns live, and blanking those would corrupt the finder alignment.
  writeFormatInfo(matrix, 0);

  // The permanently dark module.
  setModule(matrix, 8, last - 7, true);

  if (version >= 7) reserveVersionInfo(matrix, version);
}

/** BCH(15,5) check bits for the 5-bit format value. */
function formatBits(mask: number): number {
  // Level M is indicator 0b00, so the 5-bit value is just the mask.
  const value = 0b00 << 3 | mask;
  let bch = value << 10;

  for (let i = 4; i >= 0; i -= 1) {
    if (bch & (1 << (i + 10))) bch ^= 0b10100110111 << i;
  }

  return ((value << 10) | bch) ^ 0b101010000010010;
}

/** BCH(18,6) check bits for the 6-bit version number. */
function versionBits(version: number): number {
  let bch = version << 12;
  for (let i = 5; i >= 0; i -= 1) {
    if (bch & (1 << (i + 12))) bch ^= 0b1111100100101 << i;
  }
  return (version << 12) | bch;
}

function reserveVersionInfo(matrix: Matrix, version: number) {
  const bits = versionBits(version);
  const last = matrix.size - 1;

  for (let i = 0; i < 18; i += 1) {
    const dark = ((bits >>> i) & 1) === 1;
    const row = Math.floor(i / 3);
    const col = i % 3;
    setModule(matrix, row, last - 10 + col, dark);
    setModule(matrix, last - 10 + col, row, dark);
  }
}

function writeFormatInfo(matrix: Matrix, mask: number) {
  const bits = formatBits(mask);
  const last = matrix.size - 1;

  // Copy 1: around the top-left finder.
  for (let i = 0; i <= 5; i += 1) {
    setModule(matrix, 8, i, ((bits >>> i) & 1) === 1);
  }
  setModule(matrix, 8, 7, ((bits >>> 6) & 1) === 1);
  setModule(matrix, 8, 8, ((bits >>> 7) & 1) === 1);
  setModule(matrix, 7, 8, ((bits >>> 8) & 1) === 1);
  for (let i = 9; i < 15; i += 1) {
    setModule(matrix, 14 - i, 8, ((bits >>> i) & 1) === 1);
  }

  // Copy 2: split between the top-right and bottom-left finders.
  for (let i = 0; i < 8; i += 1) {
    setModule(matrix, last - i, 8, ((bits >>> i) & 1) === 1);
  }
  for (let i = 8; i < 15; i += 1) {
    setModule(matrix, 8, last - 14 + i, ((bits >>> i) & 1) === 1);
  }
}

/** The eight standard mask conditions. */
function maskCondition(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

/**
 * Two-module-wide zigzag placement.
 *
 * Column pairs are walked right to left; direction alternates per pair, and the
 * vertical timing column (6) is stepped over rather than written into. `upward` is
 * derived from the column index instead of being toggled, so a `continue` can
 * never desynchronise the direction from the position.
 */
function placeData(matrix: Matrix, codewords: Uint8Array) {
  let bitIndex = 0;

  for (let right = matrix.size - 1; right >= 1; right -= 2) {
    // Column 6 is the vertical timing pattern. Only *that* pair shifts left onto
    // columns 5/4; the test has to be an exact match, because `right <= 6` would
    // keep firing on every later iteration and skip two more columns entirely.
    if (right === 6) right = 5;

    for (let vertical = 0; vertical < matrix.size; vertical += 1) {
      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? matrix.size - 1 - vertical : vertical;

        if (isReserved(matrix, x, y)) continue;

        const byte = codewords[bitIndex >>> 3];
        const bit = byte === undefined ? 0 : (byte >>> (7 - (bitIndex & 7))) & 1;
        bitIndex += 1;

        matrix.modules[y * matrix.size + x] = bit;
      }
    }
  }
}

function applyMask(matrix: Matrix, mask: number): Uint8Array {
  const masked = Uint8Array.from(matrix.modules);

  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (isReserved(matrix, x, y)) continue;
      if (maskCondition(mask, x, y)) {
        masked[y * matrix.size + x] ^= 1;
      }
    }
  }

  return masked;
}

/* --------------------------------------------------------- Mask evaluation */

function penalty(modules: Uint8Array, size: number): number {
  const at = (x: number, y: number) => modules[y * size + x];
  let score = 0;

  // Rule 1: runs of five or more same-coloured modules in a line.
  for (let i = 0; i < size; i += 1) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let j = 1; j < size; j += 1) {
        const current = horizontal ? at(j, i) : at(i, j);
        const previous = horizontal ? at(j - 1, i) : at(i, j - 1);
        if (current === previous) {
          run += 1;
        } else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      if (run >= 5) score += run - 2;
    }
  }

  // Rule 2: 2x2 blocks of a single colour.
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const value = at(x, y);
      if (
        value === at(x + 1, y) &&
        value === at(x, y + 1) &&
        value === at(x + 1, y + 1)
      ) {
        score += 3;
      }
    }
  }

  // Rule 3: the 1:1:3:1:1 finder-like pattern with four light modules either side.
  const pattern = [1, 0, 1, 1, 1, 0, 1];
  const matches = (get: (offset: number) => number, start: number) => {
    for (let i = 0; i < 7; i += 1) {
      if (get(start + i) !== pattern[i]) return false;
    }
    const before = [start - 4, start - 3, start - 2, start - 1].every(
      (index) => get(index) === 0
    );
    const after = [start + 7, start + 8, start + 9, start + 10].every(
      (index) => get(index) === 0
    );
    return before || after;
  };

  for (let i = 0; i < size; i += 1) {
    const row = (index: number) =>
      index < 0 || index >= size ? 0 : at(index, i);
    const column = (index: number) =>
      index < 0 || index >= size ? 0 : at(i, index);

    for (let start = 0; start <= size - 7; start += 1) {
      if (matches(row, start)) score += 40;
      if (matches(column, start)) score += 40;
    }
  }

  // Rule 4: deviation of the dark-module proportion from 50%.
  let dark = 0;
  for (const value of modules) dark += value;
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

/* -------------------------------------------------------------- Public API */

export type QrCode = {
  /** Modules per side, excluding the quiet zone. */
  size: number;
  version: number;
  mask: number;
  /** Row-major, `size * size`, 1 = dark. */
  modules: Uint8Array;
  isDark: (x: number, y: number) => boolean;
};

export class QrCapacityError extends Error {
  constructor(length: number) {
    super(
      `${length} bytes is too long for a version ${MAX_VERSION} QR code ` +
        `(maximum ${byteCapacity(MAX_VERSION)} bytes at error-correction level M).`
    );
    this.name = "QrCapacityError";
  }
}

/**
 * Encodes `text` as a QR code.
 *
 * Chooses the smallest version that fits, then the mask with the lowest penalty
 * score — both as the spec prescribes, so the output is deterministic for a given
 * input and any conforming reader can decode it.
 */
export function encodeQrCode(text: string): QrCode {
  const data = new TextEncoder().encode(text);

  const version = VERSIONS.findIndex(
    (_, index) => data.length <= byteCapacity(index + 1)
  );
  if (version === -1) throw new QrCapacityError(data.length);

  const chosenVersion = version + 1;
  const codewords = buildCodewords(data, chosenVersion);

  const matrix = createMatrix(chosenVersion);
  drawFunctionPatterns(matrix, chosenVersion);
  placeData(matrix, codewords);

  let bestMask = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestModules = matrix.modules;

  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = applyMask(matrix, mask);
    // Format info participates in the penalty, so write it before scoring.
    const scored = { ...matrix, modules: candidate };
    writeFormatInfo(scored as Matrix, mask);

    const score = penalty(scored.modules, matrix.size);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
      bestModules = scored.modules;
    }
  }

  return {
    size: matrix.size,
    version: chosenVersion,
    mask: bestMask,
    modules: bestModules,
    isDark: (x, y) =>
      x >= 0 &&
      y >= 0 &&
      x < matrix.size &&
      y < matrix.size &&
      bestModules[y * matrix.size + x] === 1,
  };
}

/**
 * Renders a QR code as a single SVG path.
 *
 * One path rather than thousands of `<rect>`s: the same pixels with a fraction of
 * the DOM, which matters because this re-renders whenever the selected network
 * changes.
 */
export function qrCodeToSvgPath(code: QrCode): string {
  const parts: string[] = [];

  for (let y = 0; y < code.size; y += 1) {
    for (let x = 0; x < code.size; x += 1) {
      if (code.modules[y * code.size + x] === 1) {
        parts.push(`M${x} ${y}h1v1h-1z`);
      }
    }
  }

  return parts.join("");
}

export const QR_MAX_BYTES = byteCapacity(MAX_VERSION);
