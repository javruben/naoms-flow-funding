// === TEST-THEATRE PREVENTION HEADER ===
// @test-tier helper
// @covers NONE (test-support module: runs flow-domain.build() in a child Deno process so the mint-fails arm can exist at all)
// @bypasses NAOMS_FFI_LIB_PATH is pointed at an EMPTY directory in the CHILD process only — that is the failure being produced, and it is confined to the subprocess so no sibling test sharing the cached FFI handle is affected.
// @canonical-flow N/A
// @pre-seeds NONE — no chain events are seeded.
// === END HEADER ===
// src/packages/flow-funding/tests/_1314-flow-capability-subprocess.ts
//
// 1314 §6.0 escape hatch 4 test support. The FFI handle is cached per process,
// so the "mint fails" arm cannot be produced in-process without breaking every
// sibling test file that shares it. This runs `flow-domain.build()` in a child
// Deno process whose `NAOMS_FFI_LIB_PATH` points at an empty directory, and
// returns the child's single-line result for the caller to assert on.
//
// Shared by the success / failure-mode pair so both arms observe the SAME
// builder through the SAME harness, differing only in whether the FFI is up.

const HERE = new URL(".", import.meta.url).pathname;
const FLOW_DOMAIN = `${HERE}../sharing/flow-domain.ts`;
const BISCUIT_NHOP = `${HERE}../sharing/biscuit-nhop.ts`;
// The modules under test resolve `@naoms/*` through the repo's import map, so
// the child must run with the repo's deno.json — a temp-dir child without it
// dies on "Import ... not a dependency", which would look like a product
// failure rather than a harness one.
const REPO_ROOT = `${HERE}../../../..`;

const CHILD = `
import { build } from ${JSON.stringify(FLOW_DOMAIN)};
import { mintFlowShareCapability } from ${JSON.stringify(BISCUIT_NHOP)};

const settlements = { nodes: [
  { properties: { settledTotal: 42, context: "alpha" } },
  { properties: { settledTotal: 8, context: "beta" } },
] };
const ctx = {
  level: "detailed",
  peerDid: "did:key:zPeer",
  graphQuery: (q) => q.type === "flow_settlement" ? settlements : { nodes: [] },
};
const mint = mintFlowShareCapability();
const out = await build(ctx);
console.log(
  "MINT=" + (mint === null ? "null" : "ok") +
  " SETTLEMENTS=" + settlements.nodes.length +
  " BUILD=" + (out === null ? "null" : JSON.stringify(out)),
);
`;

async function runChild(libDir: string): Promise<string> {
  const script = await Deno.makeTempFile({ suffix: ".ts" });
  await Deno.writeTextFile(script, CHILD);
  try {
    const cmd = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "-A",
        "--unstable-ffi",
        "--no-check",
        "--config",
        `${REPO_ROOT}/deno.json`,
        script,
      ],
      cwd: REPO_ROOT,
      env: { ...Deno.env.toObject(), NAOMS_FFI_LIB_PATH: libDir },
      stdout: "piped",
      stderr: "piped",
    });
    const { stdout, stderr } = await cmd.output();
    const text = new TextDecoder().decode(stdout);
    const line = text.split("\n").find((l) => l.startsWith("MINT="));
    if (!line) {
      throw new Error(
        `child produced no result line.\nstdout:\n${text}\nstderr:\n` +
          new TextDecoder().decode(stderr),
      );
    }
    return line;
  } finally {
    await Deno.remove(script).catch(() => {});
  }
}

/** Run the builder with NO usable dylib — the mint must fail. */
export async function runFlowBuildWithFfiDown(): Promise<string> {
  const empty = await Deno.makeTempDir();
  try {
    return await runChild(empty);
  } finally {
    await Deno.remove(empty, { recursive: true }).catch(() => {});
  }
}

/**
 * Run the builder with the SAME dylib this test process is using — the
 * discriminating arm. Without it, "shares nothing" would be indistinguishable
 * from a builder that shares nothing ever.
 *
 * The directory comes from the canonical resolver, not a hand-built path, so
 * the two arms differ in exactly one thing: whether a dylib is there.
 */
export async function runFlowBuildWithFfiUp(): Promise<string> {
  const { resolveNaomsCoreLibPath } = await import(
    "@naoms/core/ffi/naoms-core.ts"
  );
  const full = resolveNaomsCoreLibPath();
  return await runChild(full.slice(0, full.lastIndexOf("/")));
}
