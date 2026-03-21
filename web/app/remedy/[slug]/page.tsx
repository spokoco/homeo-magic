import fs from "fs";
import path from "path";
import RemedyReader from "./RemedyReader";

export async function generateStaticParams() {
  const dir = path.join(process.cwd(), "public/data/kent/remedy_markdown");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((f) => ({ slug: f.replace(/\.md$/, "") }));
}

export default async function RemedyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <RemedyReader slug={slug} />;
}
