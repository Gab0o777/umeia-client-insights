/**
 * src/lib/vaultItem.ts
 * ~~~~~~~~~~~~~~~~~~~~~
 * Shape of a decrypted vault credential plus the helpers to build and
 * normalize it. This is the *plaintext* that Boveda.tsx JSON-stringifies
 * and hands to the DEK for encryption (src/lib/vaultCrypto.ts) — the
 * backend never sees any of it, so adding/changing fields here is a pure
 * client-side change.
 *
 * A credential is a versioned list of fields instead of a fixed set of
 * keys, so each one can carry whatever custom fields the user wants.
 * `normalizeToV2` keeps items saved under the old fixed shape readable.
 */

export type FieldType = "username" | "password" | "url" | "text" | "number" | "note";

export interface VaultField {
  id: string; // crypto.randomUUID() — stable key for React + per-field reveal state
  type: FieldType;
  label: string; // editable; defaults per type
  value: string; // numbers are stored as strings
}

export interface ItemPayload {
  version: 2;
  title: string;
  fields: VaultField[];
}

interface FieldDef {
  label: string;
  input: "input" | "textarea";
  inputType?: "number";
  masked: boolean;
}

export const FIELD_DEFS: Record<FieldType, FieldDef> = {
  username: { label: "Usuario", input: "input", masked: false },
  password: { label: "Contraseña", input: "input", masked: true },
  url: { label: "URL", input: "input", masked: false },
  text: { label: "Texto", input: "input", masked: false },
  number: { label: "Número", input: "input", inputType: "number", masked: false },
  note: { label: "Nota", input: "textarea", masked: false },
};

/** Types offered by the "Agregar campo" menu, in display order. */
export const ADDABLE_FIELD_TYPES: FieldType[] = ["text", "number", "note", "url"];

export function newField(type: FieldType): VaultField {
  return { id: crypto.randomUUID(), type, label: FIELD_DEFS[type].label, value: "" };
}

/** A blank credential: title + the two base fields (user / password). */
export function newItem(): ItemPayload {
  return { version: 2, title: "", fields: [newField("username"), newField("password")] };
}

// ── legacy (V1) support ──────────────────────────────────────────────────
// Items saved before dynamic fields had this fixed shape.
interface LegacyItemPayload {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}

const LEGACY_FIELD_ORDER: Array<[keyof Omit<LegacyItemPayload, "title">, FieldType]> = [
  ["username", "username"],
  ["password", "password"],
  ["url", "url"],
  ["notes", "note"],
];

function isV2(parsed: unknown): parsed is ItemPayload {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as { version?: unknown }).version === 2 &&
    Array.isArray((parsed as { fields?: unknown }).fields)
  );
}

/**
 * Coerce whatever we decrypted into the current V2 shape:
 *   - already V2 → returned as-is (idempotent).
 *   - old fixed shape → mapped to fields (only non-empty values are kept).
 *   - unparseable / null → a placeholder item that renders "(no se pudo descifrar)".
 */
export function normalizeToV2(parsed: unknown): ItemPayload {
  if (isV2(parsed)) return parsed;

  if (typeof parsed === "object" && parsed !== null) {
    const legacy = parsed as Partial<LegacyItemPayload>;
    const fields: VaultField[] = [];
    for (const [key, type] of LEGACY_FIELD_ORDER) {
      const value = legacy[key];
      if (typeof value === "string" && value !== "") {
        fields.push({ ...newField(type), value });
      }
    }
    return { version: 2, title: typeof legacy.title === "string" ? legacy.title : "", fields };
  }

  return { version: 2, title: "(no se pudo descifrar)", fields: [] };
}
