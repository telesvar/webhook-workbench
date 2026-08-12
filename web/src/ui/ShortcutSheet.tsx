import { Dialog } from "./Dialog";
import { Kbd } from "./Kbd";

interface ShortcutSheetProps {
  onClose: () => void;
  open: boolean;
}

const groups: { title: string; shortcuts: [keys: string[], action: string][] }[] = [
  {
    title: "Events",
    shortcuts: [
      [["↓", "j"], "Next event"],
      [["↑", "k"], "Previous event"],
      [["Enter"], "Focus the inspector"],
    ],
  },
  {
    title: "Everywhere",
    shortcuts: [
      [["c"], "Create an inbox"],
      [["m"], "Show or hide masked values"],
      [["f"], "Toggle formatted or raw body"],
      [["?"], "Open this sheet"],
      [["Esc"], "Close a dialog"],
    ],
  },
];

export function ShortcutSheet({ onClose, open }: ShortcutSheetProps) {
  return (
    <Dialog
      description="Active whenever you are not typing in a field."
      onClose={onClose}
      open={open}
      title="Keyboard shortcuts"
    >
      <div className="px-6 pt-4 pb-6">
        {groups.map((group) => (
          <section className="mt-4 first:mt-0" key={group.title}>
            <h3 className="mb-1 text-[10px] font-bold tracking-[0.13em] text-neutral-500 uppercase">
              {group.title}
            </h3>
            <dl>
              {group.shortcuts.map(([keys, action]) => (
                <div
                  className="flex items-center justify-between gap-4 border-b border-neutral-200 py-2 last:border-b-0 dark:border-neutral-800"
                  key={action}
                >
                  <dt className="flex gap-1.5">
                    {keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </dt>
                  <dd className="text-xs text-neutral-600 dark:text-neutral-400">{action}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
