"use client";

import * as React from "react";
import { Input } from "@/src/components/ui/input";

/**
 * Input angka uang: min 0, keyboard numerik, dan scroll mouse tidak
 * mengubah nilai secara tidak sengaja.
 */
export const MoneyInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>(function MoneyInput(props, ref) {
  return (
    <Input
      ref={ref}
      type="number"
      min={0}
      inputMode="numeric"
      onWheel={(e) => e.currentTarget.blur()}
      {...props}
    />
  );
});
