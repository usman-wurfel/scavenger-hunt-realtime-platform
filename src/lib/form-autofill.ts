export const formNoAutofill = { autoComplete: "off" } as const;

export const inputNoAutofill = { autoComplete: "off" } as const;

/** Chrome often ignores "off" on password fields; this blocks saved-password autofill. */
export const passwordNoAutofill = { autoComplete: "new-password" } as const;

export const numberInputProps = {
  min: 1,
  step: 1,
  inputMode: "numeric" as const,
  className: "number-input-no-spinner",
  autoComplete: "off",
};

export function acceptMinOneFtInput(value: string): boolean {
  if (value === "") return true;
  if (value.includes("-")) return false;
  const num = Number(value);
  return Number.isFinite(num) && num >= 1;
}
