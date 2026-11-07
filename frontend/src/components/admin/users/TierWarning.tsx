import { TriangleAlert } from "lucide-react";

interface TierWarningProps {
  text: string;
  testId: string;
}

// Announces that saving moves the account to another tier.
export function TierWarning({ text, testId }: TierWarningProps) {
  return (
    <div
      role="status"
      data-testid={`assign-warning-${testId}`}
      className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p>{text}</p>
    </div>
  );
}
