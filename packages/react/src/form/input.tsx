"use client";

import * as React from "react";

import { ComponentDefaultsProvider, splitRadius, type WithRadius } from "../defaults";
import { NumberField, type NumberFieldProps } from "./number-field";
import { PasswordField, type PasswordFieldProps } from "./password-field";
import { PhoneField, type PhoneFieldProps } from "./phone-field";
import { SearchField, type SearchFieldProps } from "./search-field";
import { TextField, type TextFieldProps } from "./text-field";

/** What the field holds; it picks the keyboard, the behaviour and the props that apply. */
export type InputType = "text" | "email" | "url" | "password" | "search" | "number" | "tel";

export type InputTextProps = Omit<TextFieldProps, "type"> & {
  /** `text` (default), `email` or `url`: the matching keyboard and autofill on phones. */
  type?: "text" | "email" | "url";
};
export type InputPasswordProps = PasswordFieldProps & {
  /** A password: hidden while typed, a show/hide button, and an optional strength meter. */
  type: "password";
};
export type InputSearchProps = SearchFieldProps & {
  /** A search box: a search icon, a clear button and Esc to clear. */
  type: "search";
};
export type InputNumberProps = NumberFieldProps & {
  /** A number (the value is a number): locale formatting, currency or units, min/max and optional steppers. */
  type: "number";
};
export type InputTelProps = PhoneFieldProps & {
  /** A phone number: a country picker and the value as E.164 ("+38267123456"). */
  type: "tel";
};

export type InputProps = (InputTextProps | InputPasswordProps | InputSearchProps | InputNumberProps | InputTelProps) & WithRadius;

/**
 * The one text-entry field, with a label, description and error: `type` picks what it holds (text, email, url,
 * password, search, number or tel) and the props that go with it, as an `<input type>` does. For several lines
 * use TextArea; for a one-time code, OtpField.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(allProps, ref) {
  const [radius, props] = splitRadius(allProps) as [InputProps["radius"], Omit<InputProps, "radius">];
  return <ComponentDefaultsProvider value={{ radius }}>{field(props as InputProps, ref)}</ComponentDefaultsProvider>;
});

function field(props: InputProps, ref: React.ForwardedRef<HTMLInputElement>) {
  switch (props.type) {
    case "password": {
      const { type: _type, ...rest } = props;
      return <PasswordField {...rest} ref={ref} />;
    }
    case "search": {
      const { type: _type, ...rest } = props;
      return <SearchField {...rest} ref={ref} />;
    }
    case "number": {
      const { type: _type, ...rest } = props;
      return <NumberField {...rest} ref={ref} />;
    }
    case "tel": {
      const { type: _type, ...rest } = props;
      return <PhoneField {...rest} ref={ref} />;
    }
    default:
      return <TextField {...props} ref={ref} />;
  }
}
