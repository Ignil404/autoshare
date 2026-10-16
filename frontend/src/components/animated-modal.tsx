import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedModalProps {
  open: boolean;
  onClose: () => void;
  originRect: DOMRect | null;
  children: ReactNode;
  className?: string;
}

export function AnimatedModal({ open, onClose, originRect, children, className }: AnimatedModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"closed" | "from" | "to">("closed");

  useEffect(() => {
    if (!open) {
      setPhase("closed");
      return;
    }
    setPhase("from");
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase("to");
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const handleClose = useCallback(() => {
    setPhase("from");
    setTimeout(() => {
      setPhase("closed");
      onClose();
    }, 300);
  }, [onClose]);

  if (phase === "closed" && !open) return null;

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const ox = originRect ? originRect.left + originRect.width / 2 : cx;
  const oy = originRect ? originRect.top + originRect.height / 2 : cy;
  const dx = ox - cx;
  const dy = oy - cy;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          "absolute inset-0 transition-all duration-300",
          phase === "to" ? "bg-black/40 backdrop-blur-sm" : "bg-transparent"
        )}
        onClick={handleClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={cn("absolute left-1/2 top-1/2 w-full max-w-lg", className)}
        style={{
          transform: phase === "to"
            ? "translate(-50%, -50%) scale(1)"
            : `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.4)`,
          opacity: phase === "to" ? 1 : 0,
          pointerEvents: phase === "to" ? "auto" : "none",
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalClose({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      className={cn(
        "absolute right-4 top-4 rounded-full h-8 w-8 flex items-center justify-center",
        "bg-black/10 hover:bg-black/20 transition-colors z-10",
        className
      )}
    >
      <X className="h-4 w-4" />
    </button>
  );
}
