import { del, get, set } from "idb-keyval";

export interface PageChunk {
  id: string;
  text: string;
  embedding: number[];
}

export interface PageIndex {
  url: string;
  title: string;
  summary: string;
  chunks: PageChunk[];
  indexedAt: number;
}

const keyFor = (url: string) => `page:${url}`;

export async function getPageIndex(url: string): Promise<PageIndex | undefined> {
  return (await get(keyFor(url))) as PageIndex | undefined;
}

export async function setPageIndex(index: PageIndex): Promise<void> {
  await set(keyFor(index.url), index);
}

export async function deletePageIndex(url: string): Promise<void> {
  await del(keyFor(url));
}
