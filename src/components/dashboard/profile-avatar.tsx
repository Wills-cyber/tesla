"use client";

import * as React from "react";
import { ImagePlus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/format";

type ProfileAvatarProps = {
  fullName: string | null;
  avatarUrl: string | null;
  /** False in preview mode, where there's no account to attach an upload to. */
  editable: boolean;
};

/**
 * Avatar with an upload affordance.
 *
 * The upload button is disabled rather than absent: it shows where the feature
 * will live and explains why it isn't active. Avatar files will go to a Supabase
 * Storage bucket with its own RLS policy, so there is no client-side upload path
 * to build until that bucket exists.
 */
export function ProfileAvatar({
  fullName,
  avatarUrl,
  editable,
}: ProfileAvatarProps) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar className="size-16 border border-hairline">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback className="bg-brand-surface-strong text-lg font-medium text-brand-emphasis">
          {fullName ? getInitials(fullName) : "—"}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          {fullName ?? "No name on file"}
        </p>
        <Button variant="hairline" size="sm" disabled className="self-start">
          <ImagePlus />
          {editable ? "Upload photo — coming soon" : "Upload unavailable"}
        </Button>
        <p className="text-[0.7rem] leading-relaxed text-subtle-foreground">
          Avatar uploads need a Supabase Storage bucket, which isn&apos;t
          connected yet.
        </p>
      </div>
    </div>
  );
}
