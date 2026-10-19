"use client";

import React from "react";

interface HoneypotFieldProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
}

/**
 * Invisible honeypot field used for native bot mitigation.
 * Ordinary human users and screen-readers never interact with or fill this field.
 * Automated spam scripts that naively populate all input fields will trip this trap.
 */
export default function HoneypotField({
  value,
  onChange,
  name = "website_url_hp",
  id = "website_url_hp",
}: HoneypotFieldProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: "-9999px",
        top: "-9999px",
        opacity: 0,
        height: 0,
        width: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: -1,
      }}
      aria-hidden="true"
    >
      <label htmlFor={id}>Do not fill this field</label>
      <input
        type="text"
        name={name}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
