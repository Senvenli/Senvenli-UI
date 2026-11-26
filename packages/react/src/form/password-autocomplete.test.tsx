import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Input } from "./index";
import { PasswordField } from "./password-field";

afterEach(cleanup);
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);

it("a masked secret that is not a password takes autoComplete off, so password managers leave it alone", () => {
  inLocale(
    <>
      <PasswordField label="Transfer code" autoComplete="off" />
      <Input type="password" label="API key" autoComplete="off" />
    </>,
  );
  for (const name of ["Transfer code", "API key"]) {
    const input = screen.getByLabelText(name) as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(input.getAttribute("autocomplete")).toBe("off");
  }
});
