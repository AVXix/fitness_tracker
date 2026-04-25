"use client";

import { useState } from "react";

interface TrainerProfileFieldsProps {
  defaultIsTrainer: boolean;
  defaultTrainerContact: string;
}

export function TrainerProfileFields({
  defaultIsTrainer,
  defaultTrainerContact,
}: TrainerProfileFieldsProps) {
  const [isTrainer, setIsTrainer] = useState(defaultIsTrainer);

  return (
    <>
      <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800">
        <input
          type="checkbox"
          name="isTrainer"
          checked={isTrainer}
          onChange={(event) => setIsTrainer(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
        />
        Are you a trainer?
      </label>

      {isTrainer ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <label htmlFor="trainerContact" className="mb-2 block text-sm font-medium text-zinc-800">
            Trainer contact details
          </label>
          <input
            id="trainerContact"
            name="trainerContact"
            defaultValue={defaultTrainerContact}
            placeholder="Phone, WhatsApp, email, or booking link"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
          />
          <p className="mt-2 text-xs text-zinc-600">
            This will be shown on the trainer page when people want to hire you.
          </p>
        </div>
      ) : null}
    </>
  );
}
