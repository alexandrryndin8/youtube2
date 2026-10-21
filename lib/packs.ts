// Тематические наборы слов, которые включаются читкодами. Общий для клиента и сервера.
export const PACKS = ["minecraft"] as const;

export type Pack = (typeof PACKS)[number];

export const isPack = (v: unknown): v is Pack => PACKS.includes(v as Pack);
