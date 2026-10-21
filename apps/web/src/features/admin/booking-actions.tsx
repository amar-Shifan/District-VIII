"use client";

import type { BookingDto } from "@district-viii/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Modal } from "@/components/admin/Overlay";
import { useToast } from "@/components/admin/Toaster";
import { AdminButton, TextAreaField } from "@/components/admin/ui";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { errorMessage } from "@/lib/api-error";

/** Approve, reject and cancel with toasts and cache refresh. Shared by the dashboard and the bookings table. */
export function useBookingActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const onSettled = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.bookingsAll });
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats });
    void queryClient.invalidateQueries({ queryKey: adminKeys.charts });
  };
  const onError = (error: unknown) => toast({ tone: "error", title: "Action failed", description: errorMessage(error) });

  const approve = useMutation({
    mutationFn: (booking: BookingDto) => adminApi.approve(booking.id),
    onSuccess: (booking) => toast({ tone: "success", title: "Booking approved", description: `${booking.customerName} · ${booking.unitName}` }),
    onError,
    onSettled,
  });
  const reject = useMutation({
    mutationFn: ({ booking, reason }: { booking: BookingDto; reason?: string }) => adminApi.reject(booking.id, reason),
    onSuccess: (booking) => toast({ tone: "success", title: "Booking rejected", description: `${booking.customerName} · ${booking.unitName}` }),
    onError,
    onSettled,
  });
  const cancel = useMutation({
    mutationFn: (booking: BookingDto) => adminApi.cancel(booking.id),
    onSuccess: (booking) => toast({ tone: "success", title: "Booking cancelled", description: `${booking.customerName} · ${booking.unitName}` }),
    onError,
    onSettled,
  });

  return { approve, reject, cancel };
}

export function RejectDialog({
  booking,
  onClose,
  onConfirm,
  pending,
}: {
  booking: BookingDto | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  pending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={booking !== null}
      onClose={onClose}
      title="Reject request"
      description={booking ? `${booking.customerName} · ${booking.unitName}. The customer sees the reason.` : undefined}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>
            Keep pending
          </AdminButton>
          <AdminButton
            variant="outline"
            disabled={pending}
            onClick={() => {
              onConfirm(reason.trim());
              setReason("");
            }}
          >
            Reject booking
          </AdminButton>
        </>
      }
    >
      <TextAreaField
        label="Reason (optional)"
        placeholder="e.g. Table reserved for a tournament"
        maxLength={200}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        hint={`${reason.length}/200`}
        data-autofocus
      />
    </Modal>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  pending,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} data-autofocus>
            Go back
          </AdminButton>
          <AdminButton disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </AdminButton>
        </>
      }
    >
      <p className="text-sm text-wine-ink/70">This can&apos;t be undone.</p>
    </Modal>
  );
}
