import { Kbd } from "../ui/Kbd";
import { useRevealed } from "./masking";

export function RevealedNotice() {
  if (!useRevealed()) {
    return null;
  }
  return (
    <span className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-500">
      <Kbd>m</Kbd>
      <span className="hidden sm:inline">Revealed</span>
    </span>
  );
}
