import { randomBytes, randomUUID, createCipheriv } from "node:crypto";
import { webcrypto } from "node:crypto";
import WebSocket from "ws";

const WEB_URL = process.env.BLACK_MAMBA_WEB_URL ?? "http://ec2-13-53-212-66.eu-north-1.compute.amazonaws.com:8090";
const WS_URL = process.env.BLACK_MAMBA_WS_URL ?? "ws://ec2-13-53-212-66.eu-north-1.compute.amazonaws.com:8090";

const subtle = webcrypto.subtle;

function green(t: string) { return `\x1b[32m${t}\x1b[0m`; }
function orange(t: string) { return `\x1b[38;5;208m${t}\x1b[0m`; }
function red(t: string) { return `\x1b[31m${t}\x1b[0m`; }
function dim(t: string) { return `\x1b[2m${t}\x1b[0m`; }
function bold(t: string) { return `\x1b[1m${t}\x1b[0m`; }
function cyan(t: string) { return `\x1b[36m${t}\x1b[0m`; }

function genRoomId(): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(4);
  return `G-${Array.from(bytes, (v) => alpha[v % alpha.length]).join("")}`;
}

export async function runSecretCommand(secretText: string): Promise<void> {
  process.stdout.write("\u001Bc");
  process.stdout.write(orange(`
  ███████╗███████╗ ██████╗██████╗ ███████╗████████╗
  ██╔════╝██╔════╝██╔════╝██╔══██╗██╔════╝╚══██╔══╝
  ███████╗█████╗  ██║     ██████╔╝█████╗     ██║
  ╚════██║██╔══╝  ██║     ██╔══██╗██╔══╝     ██║
  ███████║███████╗╚██████╗██║  ██║███████╗   ██║
  ╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝\n\n`) );

  process.stdout.write(`  ${dim("▸")} ${orange("GENERATING")} one-time encrypted secret...\n`);

  const rawKey = randomBytes(32);
  const iv = randomBytes(12);

  const aesKey = await subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const enc = await subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    Buffer.from(secretText, "utf8")
  );

  const ciphertext = Buffer.from(enc).toString("base64");
  const payload = JSON.stringify({
    iv: iv.toString("base64"),
    ct: ciphertext
  });

  const roomId = genRoomId();
  const keyB64 = rawKey.toString("base64");
  const senderPub = randomBytes(32).toString("base64");
  const clientId = randomUUID();

  process.stdout.write(`  ${dim("▸")} ${orange("ENCRYPTING")} payload :: AES-256-GCM\n`);
  process.stdout.write(`  ${dim("▸")} ${orange("DEPOSITING")} to ghost room ${roomId}...\n`);

  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(WS_URL);
    socket.on("open", () => {
      socket.send(JSON.stringify({
        type: "join",
        roomId,
        messageId: randomUUID(),
        sender: senderPub,
        timestamp: Date.now(),
        payload: { clientId, fingerprint: "SECRET" }
      }));
      socket.send(JSON.stringify({
        type: "message",
        roomId,
        messageId: randomUUID(),
        sender: senderPub,
        timestamp: Date.now(),
        payload: {
          clientId,
          burnAfterRead: true,
          secret: true,
          ciphertext: payload,
          recipients: {}
        }
      }));
      socket.close();
      resolve();
    });
    socket.on("error", reject);
  });

  const link = `${WEB_URL}/s/${roomId}#key=${encodeURIComponent(keyB64)}`;

  process.stdout.write(`\n  ${green("◈ SECRET CREATED")}\n`);
  process.stdout.write(`  ${dim("─────────────────────────────────────────────────────────")}\n`);
  process.stdout.write(`  ${dim("└─")} ${bold(cyan(link))}\n`);
  process.stdout.write(`  ${dim("─────────────────────────────────────────────────────────")}\n\n`);
  process.stdout.write(`  ${dim("◈")} expires in ${orange("10 minutes")} · one read only\n`);
  process.stdout.write(`  ${dim("◈")} decryption key is in the URL fragment ${dim("(never sent to server)")}\n`);
  process.stdout.write(`  ${dim("◈")} server stores only ciphertext — ${green("zero plaintext exposure")}\n\n`);
  process.stdout.write(`  ${red("[ COPY THE LINK ABOVE — IT CANNOT BE RETRIEVED AGAIN ]")}\n\n`);
}
