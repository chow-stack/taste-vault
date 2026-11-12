/**
 * Pulls stills out of a clip waiting in the inbox, so Claude Code can read the motion.
 *
 *   npm run frames -- <inbox id>                pull everything below
 *   npm run frames -- <inbox id> --still <s>    only replace the still with the frame at <s> seconds
 *
 * Writes:
 *   vault/inbox/<id>.jpg                a first guess at the still that stands in for the clip: the most typical
 *                                       frame after the intro. Check it, and pick a better time with --still.
 *   vault/inbox/<id>.frames/NNN.jpg     single frames, evenly spaced, 960px wide
 *   vault/inbox/<id>.frames/sheet-N.jpg the same frames nine to a sheet, in reading order, for an overview
 *   vault/inbox/<id>.frames/index.json  duration, size, and the time of every frame
 *
 * Needs ffmpeg and ffprobe on the PATH (brew install ffmpeg).
 */
import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { VAULT_DIR } from "../src/server/config.ts";

const run = promisify(execFile);
const INBOX = path.join(VAULT_DIR, "inbox");
/** Enough frames to follow a short interaction without drowning in near-duplicates. */
const MAX_FRAMES = 48;
const MAX_FPS = 12;

const [id, flag, at] = process.argv.slice(2);
const stillAt = flag === "--still" ? Number(at) : undefined;
if (!id || !/^\d{8}-\d{6}-[a-f0-9]{4}$/.test(id) || (flag !== undefined && !(stillAt! >= 0))) {
  console.error("Usage: npm run frames -- <inbox id> [--still <seconds>]");
  process.exit(1);
}

async function ffmpeg(args: string[]) {
  try {
    return await run("ffmpeg", ["-v", "error", "-y", ...args], { maxBuffer: 16 * 1024 * 1024 });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new Error("ffmpeg is missing. Install it with: brew install ffmpeg", { cause: err });
    throw err;
  }
}

async function probe(file: string) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height:format=duration",
    "-of", "json", file,
  ]);
  const info = JSON.parse(stdout) as { streams?: { width?: number; height?: number }[]; format?: { duration?: string } };
  const duration = Number(info.format?.duration);
  const { width = 0, height = 0 } = info.streams?.[0] ?? {};
  if (!duration || !width) throw new Error("That file has no readable video track.");
  return { duration, width, height };
}

const meta = JSON.parse(await readFile(path.join(INBOX, `${id}.json`), "utf8")) as { source?: string; file?: string };
if (meta.source !== "video" || !meta.file || !/^[\w.-]+$/.test(meta.file)) throw new Error(`${id} is not a clip.`);
const clip = path.join(INBOX, meta.file);
const out = path.join(INBOX, `${id}.frames`);

const { duration, width, height } = await probe(clip);
const still = path.join(INBOX, `${id}.jpg`);

if (stillAt !== undefined) {
  if (stillAt > duration) throw new Error(`The clip is only ${duration.toFixed(2)}s long.`);
  await ffmpeg(["-ss", stillAt.toFixed(3), "-i", clip, "-frames:v", "1", "-q:v", "3", still]);
  console.log(`Still: vault/inbox/${id}.jpg, from ${stillAt}s`);
  process.exit(0);
}

const fps = Math.min(MAX_FPS, MAX_FRAMES / duration);

await rm(out, { recursive: true, force: true });
await mkdir(out);

// The still: the most typical frame of the clip, skipping the first fifth where intros, loaders and
// wipes usually sit. ffmpeg's thumbnail filter picks the sampled frame closest to the average of all of them.
const from = duration * 0.2;
const samples = Math.max(1, Math.min(40, Math.round((duration - from) * 4)));
await ffmpeg([
  "-ss", from.toFixed(3), "-i", clip,
  "-vf", `fps=${(samples / (duration - from)).toFixed(4)},thumbnail=${samples}`,
  "-frames:v", "1", "-q:v", "3", still,
]);
await ffmpeg(["-i", clip, "-vf", `fps=${fps.toFixed(4)},scale='min(960,iw)':-2`, "-q:v", "4", path.join(out, "%03d.jpg")]);
await ffmpeg(["-i", clip, "-vf", `fps=${fps.toFixed(4)},scale=480:-2,tile=3x3:padding=6:color=white`, "-q:v", "4", path.join(out, "sheet-%d.jpg")]);

const frames = (await readdir(out)).filter((f) => /^\d+\.jpg$/.test(f)).sort();
const sheets = (await readdir(out)).filter((f) => f.startsWith("sheet-")).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6)));
const index = {
  clip: meta.file,
  duration: Number(duration.toFixed(2)),
  width,
  height,
  fps: Number(fps.toFixed(2)),
  sheets,
  frames: frames.map((file, i) => ({ file, t: Number((i / fps).toFixed(2)) })),
};
await writeFile(path.join(out, "index.json"), `${JSON.stringify(index, null, 2)}\n`);

console.log(`${meta.file}: ${index.duration}s, ${width}x${height}`);
console.log(`Still: vault/inbox/${id}.jpg`);
console.log(`${frames.length} frames at ${index.fps} fps and ${sheets.length} sheets in vault/inbox/${id}.frames/`);
