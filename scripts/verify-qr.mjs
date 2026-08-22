/**
 * Verifies `src/lib/qr/qr-code.ts` by decoding its output.
 *
 *   node scripts/verify-qr.mjs
 *
 * A hand-written QR encoder that produces a *plausible-looking* but unreadable
 * bitmap is worse than no encoder at all when the payload is a crypto deposit
 * address. So this does not eyeball the image — it implements an independent
 * reader (geometry, format-info decode, unmask, de-interleave, Reed–Solomon
 * syndrome check and Berlekamp–Massey correction, bitstream parse) and asserts the
 * original string comes back out.
 *
 * The reader derives the function-pattern map, the zigzag order and the block
 * layout from the specification on its own rather than importing the encoder's
 * helpers, so an encoder bug cannot hide behind shared code.
 *
 * It also injects byte errors to prove the error correction genuinely works, which
 * is the property that makes a QR code survive a phone camera.
 */
import assert from "node:assert/strict";

import { encodeQrCode } from "../src/lib/qr/qr-code.ts";

/* ------------------------------------------------------------ GF(256) again */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
}
const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);
const inv = (a) => EXP[255 - LOG[a]];

/* ------------------------------------------ Independent version parameters */

const SPECS = [
  [26, 10, 1, []],
  [44, 16, 1, [6, 18]],
  [70, 26, 1, [6, 22]],
  [100, 18, 2, [6, 26]],
  [134, 24, 2, [6, 30]],
  [172, 16, 4, [6, 34]],
  [196, 18, 4, [6, 22, 38]],
  [242, 22, 4, [6, 24, 42]],
  [292, 22, 5, [6, 26, 46]],
  [346, 26, 5, [6, 28, 50]],
].map(([totalCodewords, ecPerBlock, blocks, alignment]) => ({
  totalCodewords,
  ecPerBlock,
  blocks,
  alignment,
}));

/* -------------------------------------------- Function-pattern map (reader) */

/**
 * Marks every module a reader must not treat as data.
 *
 * Built from the spec's geometry directly: three 8x8 finder-plus-separator
 * corners, both timing lines, the alignment grid, the two format-info strips, the
 * dark module, and (v7+) the two version-info blocks.
 */
function functionMap(version) {
  const size = version * 4 + 17;
  const map = new Uint8Array(size * size);
  const mark = (x, y) => {
    if (x >= 0 && y >= 0 && x < size && y < size) map[y * size + x] = 1;
  };

  // Finder patterns with their separators: an 8x8 corner block each.
  for (let dy = 0; dy < 8; dy += 1) {
    for (let dx = 0; dx < 8; dx += 1) {
      mark(dx, dy);
      mark(size - 1 - dx, dy);
      mark(dx, size - 1 - dy);
    }
  }

  // Timing lines.
  for (let i = 0; i < size; i += 1) {
    mark(i, 6);
    mark(6, i);
  }

  // Alignment patterns, skipping the three that sit under a finder.
  const centres = SPECS[version - 1].alignment;
  for (const cy of centres) {
    for (const cx of centres) {
      const underFinder =
        (cx <= 8 && cy <= 8) ||
        (cx <= 8 && cy >= size - 9) ||
        (cx >= size - 9 && cy <= 8);
      if (underFinder) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) mark(cx + dx, cy + dy);
      }
    }
  }

  // Format info: row 8 and column 8, plus the mirrored strips. Index 6 on each
  // axis belongs to the timing pattern and is already marked.
  for (let i = 0; i < 9; i += 1) {
    mark(8, i);
    mark(i, 8);
  }
  for (let i = 0; i < 8; i += 1) mark(size - 1 - i, 8);
  for (let i = 0; i < 8; i += 1) mark(8, size - 1 - i);

  if (version >= 7) {
    for (let i = 0; i < 18; i += 1) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      mark(a, b);
      mark(b, a);
    }
  }

  return { size, map };
}

/* -------------------------------------------------- Format-info decoding */

/** Recomputes the 32 valid format strings and picks the closest match. */
function decodeFormat(raw) {
  let best = null;
  let bestDistance = Infinity;

  for (let ecl = 0; ecl < 4; ecl += 1) {
    for (let mask = 0; mask < 8; mask += 1) {
      const value = (ecl << 3) | mask;
      let rem = value;
      for (let i = 0; i < 10; i += 1) {
        rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      }
      const bits = (((value << 10) | (rem & 0x3ff)) ^ 0x5412) & 0x7fff;

      let distance = 0;
      let diff = bits ^ raw;
      while (diff) {
        distance += diff & 1;
        diff >>>= 1;
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        best = { ecl, mask, distance };
      }
    }
  }

  return best;
}

function readFormat(code) {
  const { size, isDark } = code;
  let raw = 0;

  // First copy, read in the spec's bit order.
  for (let i = 0; i <= 5; i += 1) raw |= (isDark(8, i) ? 1 : 0) << i;
  raw |= (isDark(8, 7) ? 1 : 0) << 6;
  raw |= (isDark(8, 8) ? 1 : 0) << 7;
  raw |= (isDark(7, 8) ? 1 : 0) << 8;
  for (let i = 9; i < 15; i += 1) raw |= (isDark(14 - i, 8) ? 1 : 0) << i;

  const decoded = decodeFormat(raw);

  // Cross-check against the second copy, which must carry the same value.
  let mirror = 0;
  for (let i = 0; i < 8; i += 1) {
    mirror |= (isDark(size - 1 - i, 8) ? 1 : 0) << i;
  }
  for (let i = 8; i < 15; i += 1) {
    mirror |= (isDark(8, size - 15 + i) ? 1 : 0) << i;
  }
  const mirrorDecoded = decodeFormat(mirror);

  return { ...decoded, mirrorMask: mirrorDecoded.mask, mirrorEcl: mirrorDecoded.ecl };
}

/* -------------------------------------------------------- Reading the data */

const maskCondition = (mask, x, y) =>
  [
    (x + y) % 2 === 0,
    y % 2 === 0,
    x % 3 === 0,
    (x + y) % 3 === 0,
    (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
    ((x * y) % 2) + ((x * y) % 3) === 0,
    (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ][mask];

function readCodewords(code, version, mask) {
  const { size, map } = functionMap(version);
  assert.equal(size, code.size, "reader and encoder disagree on matrix size");

  const bits = [];

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;

    for (let vertical = 0; vertical < size; vertical += 1) {
      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;

        if (map[y * size + x]) continue;

        const dark = code.isDark(x, y);
        bits.push((dark ? 1 : 0) ^ (maskCondition(mask, x, y) ? 1 : 0));
      }
    }
  }

  const spec = SPECS[version - 1];
  const codewords = new Uint8Array(spec.totalCodewords);
  for (let i = 0; i < spec.totalCodewords; i += 1) {
    let byte = 0;
    for (let b = 0; b < 8; b += 1) byte = (byte << 1) | bits[i * 8 + b];
    codewords[i] = byte;
  }

  // Every remaining module must be a zero remainder bit.
  for (let i = spec.totalCodewords * 8; i < bits.length; i += 1) {
    assert.equal(bits[i], 0, `remainder bit ${i} is not zero`);
  }

  return codewords;
}

function deinterleave(codewords, version) {
  const spec = SPECS[version - 1];
  const totalData = spec.totalCodewords - spec.ecPerBlock * spec.blocks;
  const shortLength = Math.floor(totalData / spec.blocks);
  const longCount = totalData % spec.blocks;

  const lengths = Array.from({ length: spec.blocks }, (_, i) =>
    shortLength + (i >= spec.blocks - longCount ? 1 : 0)
  );

  const dataBlocks = lengths.map((length) => new Uint8Array(length));
  const ecBlocks = Array.from(
    { length: spec.blocks },
    () => new Uint8Array(spec.ecPerBlock)
  );

  let cursor = 0;
  const maxLength = Math.max(...lengths);
  for (let i = 0; i < maxLength; i += 1) {
    for (let b = 0; b < spec.blocks; b += 1) {
      if (i < lengths[b]) dataBlocks[b][i] = codewords[cursor++];
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i += 1) {
    for (let b = 0; b < spec.blocks; b += 1) ecBlocks[b][i] = codewords[cursor++];
  }

  assert.equal(cursor, spec.totalCodewords, "de-interleave consumed wrong length");

  return dataBlocks.map((data, i) => ({ data, ec: ecBlocks[i] }));
}

/* --------------------------------------------- Reed–Solomon verify/correct */

function syndromes(block, ecLength) {
  const result = new Uint8Array(ecLength);
  for (let i = 0; i < ecLength; i += 1) {
    let value = 0;
    for (const byte of block) value = mul(value, EXP[i]) ^ byte;
    result[i] = value;
  }
  return result;
}

/**
 * Berlekamp–Massey to find the error locator, Chien search for the positions,
 * Forney for the magnitudes.
 *
 * Syndrome convention: `syndromes()` evaluates the block as a polynomial whose
 * highest-degree coefficient is `block[0]`, so S_i = Σ_j Y_j · X_j^i with
 * X_j = α^{p_j} and p_j = block.length − 1 − errorIndex. With the syndromes
 * starting at i = 0 the Forney numerator is Ω(X⁻¹) with no extra power term.
 */
function correct(block, ecLength) {
  const syn = syndromes(block, ecLength);
  if (syn.every((value) => value === 0)) return { corrected: block, errors: 0 };

  // ---- Berlekamp–Massey. `order` is tracked explicitly rather than inferred
  // from array length, which trailing zeros would make wrong.
  let lambda = [1];
  let previous = [1];
  let order = 0;
  let shift = 1;
  let lastDiscrepancy = 1;

  for (let n = 0; n < ecLength; n += 1) {
    let discrepancy = syn[n];
    for (let i = 1; i <= order; i += 1) {
      discrepancy ^= mul(lambda[i] ?? 0, syn[n - i]);
    }

    if (discrepancy === 0) {
      shift += 1;
      continue;
    }

    const scale = mul(discrepancy, inv(lastDiscrepancy));
    const adjustment = new Array(shift)
      .fill(0)
      .concat(previous.map((coefficient) => mul(coefficient, scale)));
    const updated = combine(lambda, adjustment);

    if (2 * order <= n) {
      const saved = lambda;
      lambda = updated;
      previous = saved;
      order = n + 1 - order;
      lastDiscrepancy = discrepancy;
      shift = 1;
    } else {
      lambda = updated;
      shift += 1;
    }
  }

  // ---- Chien search: Λ(α^i) == 0 means α^i is X⁻¹ for an error at p = -i.
  const positions = [];
  for (let i = 0; i < 255; i += 1) {
    let value = 0;
    for (let j = 0; j < lambda.length; j += 1) {
      value ^= mul(lambda[j], EXP[(i * j) % 255]);
    }
    if (value === 0) positions.push((255 - i) % 255);
  }

  assert.equal(
    positions.length,
    order,
    `Chien search found ${positions.length} roots for a degree-${order} locator`
  );

  // ---- Forney: Ω = (S · Λ) truncated to x^ecLength, then
  //      e_j = X_j · Ω(X_j⁻¹) / Λ'(X_j⁻¹).
  const omega = polyMul([...syn], lambda).slice(0, ecLength);
  const corrected = Uint8Array.from(block);

  for (const position of positions) {
    const xInverse = EXP[(255 - position) % 255];
    const logXInverse = LOG[xInverse];

    let numerator = 0;
    for (let k = 0; k < omega.length; k += 1) {
      numerator ^= mul(omega[k], EXP[(logXInverse * k) % 255]);
    }

    // Formal derivative over GF(2^m): only odd-index terms survive.
    let denominator = 0;
    for (let i = 1; i < lambda.length; i += 2) {
      denominator ^= mul(lambda[i], EXP[(logXInverse * (i - 1)) % 255]);
    }

    assert.notEqual(denominator, 0, "Forney denominator vanished");

    const magnitude = mul(
      mul(numerator, inv(denominator)),
      EXP[position % 255] // the X_j factor
    );

    const index = block.length - 1 - position;
    assert.ok(index >= 0 && index < block.length, "error position out of range");
    corrected[index] ^= magnitude;
  }

  const check = syndromes(corrected, ecLength);
  assert.ok(
    check.every((value) => value === 0),
    "syndromes still non-zero after correction"
  );

  return { corrected, errors: positions.length };
}

function combine(a, b) {
  const length = Math.max(a.length, b.length);
  const result = new Array(length).fill(0);
  for (let i = 0; i < length; i += 1) {
    result[i] = (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return result;
}

function polyMul(a, b) {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      result[i + j] ^= mul(a[i], b[j]);
    }
  }
  return result;
}

/* ------------------------------------------------------- Bitstream parsing */

function parsePayload(data, version) {
  let cursor = 0;
  const take = (count) => {
    let value = 0;
    for (let i = 0; i < count; i += 1) {
      const index = cursor + i;
      const bit = (data[index >>> 3] >>> (7 - (index & 7))) & 1;
      value = (value << 1) | bit;
    }
    cursor += count;
    return value;
  };

  const mode = take(4);
  assert.equal(mode, 0b0100, `expected byte mode, read ${mode.toString(2)}`);

  const length = take(version < 10 ? 8 : 16);
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = take(8);

  return new TextDecoder().decode(bytes);
}

/* ----------------------------------------------------------------- Round trip */

function roundTrip(text, { injectErrors = 0 } = {}) {
  const code = encodeQrCode(text);
  const version = (code.size - 17) / 4;

  assert.ok(Number.isInteger(version), `bad matrix size ${code.size}`);
  assert.equal(version, code.version, "reported version disagrees with size");

  const format = readFormat(code);
  assert.equal(format.distance, 0, "format info is not an exact valid codeword");
  assert.equal(format.ecl, 0, `expected level M (0), read ${format.ecl}`);
  assert.equal(format.mask, code.mask, "decoded mask differs from the chosen mask");
  assert.equal(format.mirrorMask, format.mask, "the two format copies disagree");
  assert.equal(format.mirrorEcl, format.ecl, "the two format copies disagree");

  // Structural spot checks a scanner relies on, measured from the top-left
  // finder's centre at (3,3): dark core (d<=1), light ring (d=2), dark ring
  // (d=3), light separator (d=4).
  assert.ok(code.isDark(3, 3), "finder core (d=0) is not dark");
  assert.ok(code.isDark(4, 3), "finder core (d=1) is not dark");
  assert.ok(!code.isDark(5, 3), "finder light ring (d=2) is not light");
  assert.ok(code.isDark(6, 3), "finder dark ring (d=3) is not dark");
  assert.ok(!code.isDark(7, 3), "finder separator (d=4) is not light");
  assert.ok(code.isDark(8, 6), "horizontal timing module (8,6) is not dark");
  assert.ok(code.isDark(6, 8), "vertical timing module (6,8) is not dark");
  assert.ok(code.isDark(8, code.size - 8), "the dark module is not dark");

  let codewords = readCodewords(code, version, format.mask);
  const blocks = deinterleave(codewords, version);

  let totalErrors = 0;
  const recovered = [];

  for (const [index, block] of blocks.entries()) {
    const combined = Uint8Array.from([...block.data, ...block.ec]);

    if (injectErrors > 0) {
      // Corrupt the first `injectErrors` data bytes of every block.
      for (let i = 0; i < injectErrors && i < block.data.length; i += 1) {
        combined[i] ^= 0xa5;
      }
    }

    const { corrected, errors } = correct(combined, block.ec.length);
    totalErrors += errors;
    recovered.push(corrected.subarray(0, block.data.length));
    void index;
  }

  const data = new Uint8Array(recovered.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of recovered) {
    data.set(part, offset);
    offset += part.length;
  }

  const decoded = parsePayload(data, version);
  void codewords;

  return { decoded, version, mask: format.mask, errors: totalErrors };
}

/* ---------------------------------------------------------------- Test cases */

const cases = [
  "A",
  "tron:TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE?token=USDT",
  "ethereum:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599@1/transfer?address=0xAbC0000000000000000000000000000000000001",
  "https://tesla-electronics.example/wallet/deposit?method=usdt-tron",
  "0123456789".repeat(9), // 90 bytes — forces a multi-block version
  "x".repeat(213), // the maximum this module supports
];

let failures = 0;

for (const text of cases) {
  try {
    const clean = roundTrip(text);
    assert.equal(clean.decoded, text, "clean round trip did not match");
    assert.equal(clean.errors, 0, "clean round trip reported errors");

    // Prove the ECC is real: corrupt one byte per block and recover anyway.
    const damaged = roundTrip(text, { injectErrors: 1 });
    assert.equal(damaged.decoded, text, "damaged round trip did not recover");
    assert.ok(damaged.errors > 0, "fault injection was not detected");

    console.log(
      `PASS  v${clean.version} mask ${clean.mask}  ${text.length} bytes  ` +
        `(recovered from ${damaged.errors} injected errors)`
    );
  } catch (error) {
    failures += 1;
    console.error(`FAIL  ${text.slice(0, 48)}${text.length > 48 ? "…" : ""}`);
    console.error(`      ${error.message}`);
  }
}

// Over-long input must be refused, not silently truncated.
try {
  encodeQrCode("y".repeat(214));
  failures += 1;
  console.error("FAIL  214 bytes was accepted; it should throw QrCapacityError");
} catch (error) {
  if (error.name === "QrCapacityError") {
    console.log("PASS  over-capacity input rejected");
  } else {
    failures += 1;
    console.error(`FAIL  unexpected error for over-capacity input: ${error.message}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}

console.log("\nAll QR round-trip checks passed.");
