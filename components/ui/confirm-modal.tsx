"use client";

import * as React from "react";
import { LuLoader } from "react-icons/lu";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./modal";
import { Button } from "./button";

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary" | "secondary";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  children?: React.ReactNode;
}

/**
 * Standard confirmation dialog for destructive or high-impact actions.
 * Prompts the user to confirm before proceeding, and shows a loading spinner
 * while the async action completes.
 */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  isLoading = false,
  onConfirm,
  onClose,
  children,
}: ConfirmModalProps): React.ReactElement | null {
  return (
    <Modal open={open} onClose={() => !isLoading && onClose()} size="sm">
      <ModalHeader title={title} onClose={onClose} closeLabel={cancelLabel} />
      <ModalBody className="space-y-3">
        {description ? (
          <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">
            {description}
          </p>
        ) : null}
        {children}
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          variant="neutral"
          size="sm"
          disabled={isLoading}
          onClick={onClose}
          className="cursor-pointer"
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={variant}
          size="sm"
          disabled={isLoading}
          onClick={onConfirm}
          className="cursor-pointer"
        >
          {isLoading ? (
            <>
              <LuLoader className="size-4 animate-spin mr-2" />
              <span>{confirmLabel}</span>
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
