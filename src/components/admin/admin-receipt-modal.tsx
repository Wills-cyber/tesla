"use client";

import * as React from "react";
import { ExternalLink, FileText, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getReceiptSignedUrlAction } from "@/lib/wallet/actions";

type AdminReceiptModalProps = {
  receiptPath: string | null;
  depositReference: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminReceiptModal({
  receiptPath,
  depositReference,
  open,
  onOpenChange,
}: AdminReceiptModalProps) {
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !receiptPath) {
      return;
    }

    let isMounted = true;

    const timer = setTimeout(() => {
      if (!isMounted) return;

      // Defer state updates to avoid cascading renders warning
      setLoading(true);
      setError(null);
      setSignedUrl(null);

      (async () => {
        try {
          const res = await getReceiptSignedUrlAction(receiptPath);
          if (!isMounted) return;
          if (res.status === "success") {
            setSignedUrl(res.signedUrl);
            setError(null);
          } else {
            setError(res.message);
            setSignedUrl(null);
          }
        } catch {
          if (!isMounted) return;
          setError("Failed to load secure receipt link from private storage.");
          setSignedUrl(null);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      })();
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [open, receiptPath]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSignedUrl(null);
      setError(null);
      setLoading(false);
    }
    onOpenChange(newOpen);
  };

  const lowerPath = receiptPath?.toLowerCase() ?? "";
  const lowerUrl = signedUrl?.toLowerCase() ?? "";
  const isPdf = lowerPath.endsWith(".pdf") || lowerUrl.includes(".pdf");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-semibold">
                Payment Receipt Proof
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Deposit Reference: <span className="font-mono">{depositReference}</span>
                <br />
                <span className="text-[0.68rem]">Securely retrieved from PRIVATE bucket deposit-receipts via signed URL</span>
              </DialogDescription>
            </div>
            {signedUrl && (
              <Button asChild variant="hairline" size="sm" className="gap-1.5 shrink-0">
                <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                  <span>Open Full Size</span>
                  <ExternalLink className="size-3" />
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-hairline bg-surface-2 p-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-brand" />
              <span className="text-xs">Loading secure receipt from private storage...</span>
              <span className="text-[0.68rem] text-muted-foreground">Generating signed URL for {receiptPath}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 text-center text-xs text-destructive max-w-md">
              <X className="size-6" />
              <p className="font-medium">{error}</p>
              <p className="text-muted-foreground break-all">
                File path: <code className="font-mono text-[0.7rem]">{receiptPath}</code>
              </p>
              <p className="text-[0.68rem] text-muted-foreground">
                Bucket: deposit-receipts (PRIVATE) • Path format: {"{user_id}/{deposit_id}/{filename}"}
              </p>
            </div>
          ) : signedUrl ? (
            isPdf ? (
              <div className="flex w-full flex-col items-center gap-4 py-6">
                <div className="grid size-16 place-items-center rounded-2xl bg-surface-3 text-brand">
                  <FileText className="size-8" />
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <p className="text-sm font-semibold">PDF Document</p>
                  <p className="text-xs text-muted-foreground">
                    Receipt uploaded as a PDF document in private storage.
                  </p>
                  <p className="text-[0.68rem] text-muted-foreground mt-1">
                    Secure signed URL • Expires in 1 hour
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <Button asChild variant="accent" size="md" className="w-full">
                    <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" />
                      View PDF Document
                    </a>
                  </Button>
                  <div className="rounded-lg border border-hairline bg-surface-1 p-2">
                    <iframe
                      src={signedUrl}
                      title={`Receipt PDF for ${depositReference}`}
                      className="w-full h-64 rounded-md"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <div className="relative max-h-[65vh] w-full overflow-hidden rounded-xl bg-black/40 border border-hairline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signedUrl}
                    alt={`Payment proof for ${depositReference}`}
                    className="max-h-[65vh] w-full object-contain"
                  />
                </div>
                <p className="text-[0.68rem] text-center text-muted-foreground">
                  Image securely loaded from private bucket via signed URL • Expires in 1 hour
                </p>
              </div>
            )
          ) : (
            <p className="text-xs text-muted-foreground">No receipt file available.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
