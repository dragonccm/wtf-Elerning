import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

const allowed = new Map([
  ["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"],
  ["video/mp4", ".mp4"], ["audio/mpeg", ".mp3"], ["audio/wav", ".wav"],
  ["application/pdf", ".pdf"],
]);
const MAX_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await requireRole("TEACHER");
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Thiếu tệp" }, { status: 400 });
  const extension = allowed.get(file.type);
  if (!extension) return Response.json({ error: "Định dạng tệp không được hỗ trợ" }, { status: 415 });
  if (file.size <= 0 || file.size > MAX_BYTES) return Response.json({ error: "Tệp phải nhỏ hơn 100 MB" }, { status: 413 });

  const storedName = `${randomUUID()}${extension}`;
  const uploadDir = path.resolve(process.cwd(), "public", "uploads");
  const target = path.resolve(uploadDir, storedName);
  if (!target.startsWith(uploadDir + path.sep)) return Response.json({ error: "Đường dẫn không hợp lệ" }, { status: 400 });
  await mkdir(uploadDir, { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  const url = `/uploads/${storedName}`;
  const asset = await prisma.mediaAsset.create({ data: { ownerId: user.id, originalName: path.basename(file.name), storedName, mimeType: file.type, size: file.size, url } });
  return Response.json({ id: asset.id, url, name: asset.originalName });
}
