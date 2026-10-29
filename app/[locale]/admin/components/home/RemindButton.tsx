"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * The next step once the home says someone is overdue: nudge them, in one tap.
 *
 * There is no notification service yet, so a tap only marks the button sent
 * for the session. When the backend can text or notify, the call goes in
 * `onSend`; the button and its wording stay as they are.
 *
 * Controlled, because the same person's button shows twice -- on the row and
 * in their drawer -- and a tap in one has to show in the other. Text only,
 * like the other row actions (Send again, Open, Continue).
 */
export function RemindButton({
  label,
  sentLabel,
  name,
  sent,
  onSend,
}: {
  label: string;
  sentLabel: string;
  name: string;
  sent: boolean;
  onSend: () => void;
}): React.ReactElement {
  return (
    <Button
      type="button"
      variant="neutral"
      size="sm"
      disabled={sent}
      onClick={onSend}
      className="shrink-0"
    >
      {sent ? sentLabel : label}
      <span className="sr-only">: {name}</span>
    </Button>
  );
}
