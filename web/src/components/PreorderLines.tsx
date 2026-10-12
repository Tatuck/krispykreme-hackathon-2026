import { parseItems } from "@/lib/pricing";
import type { Preorder } from "@/db/schema";

/** "2 × Docena surtida, 1 × …" for a pre-order; old rows without items use boxType × quantity. */
export function PreorderLines({
  preorder,
  labels,
}: {
  preorder: Pick<Preorder, "items" | "boxType" | "quantity">;
  labels: Record<string, string>;
}) {
  const items = parseItems(preorder.items);
  const lines = items.length ? items.map((l) => ({ id: l.id, qty: l.qty })) : [{ id: preorder.boxType, qty: preorder.quantity }];
  return <>{lines.map((l) => `${l.qty} × ${labels[l.id] ?? l.id}`).join(", ")}</>;
}
