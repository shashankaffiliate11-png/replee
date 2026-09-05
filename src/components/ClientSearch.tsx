import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type ClientRecord = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  pan: string | null;
  entity_type: string | null;
  registered_address: string | null;
  state: string | null;
  pincode: string | null;
  signatory_name: string | null;
  signatory_designation: string | null;
  signatory_contact: string | null;
  notes: string | null;
};

// Searches across every field the clients table actually has today:
// legal name, trade name, PAN, entity type, address, state, pincode,
// signatory name, and signatory contact (which often holds a phone or
// email, since there's no dedicated column for either yet). GSTIN, a
// dedicated email column, and a dedicated mobile column don't exist in
// the schema yet — searching for those specifically won't surface a
// client based on that alone until those fields are added.
const SEARCHABLE_COLUMNS = [
  "legal_name",
  "trade_name",
  "pan",
  "entity_type",
  "registered_address",
  "state",
  "pincode",
  "signatory_name",
  "signatory_contact",
];

interface ClientSearchProps {
  firmId: string;
  onSelect: (client: ClientRecord) => void;
  placeholder?: string;
}

export default function ClientSearch({ firmId, onSelect, placeholder }: ClientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const orFilter = SEARCHABLE_COLUMNS.map((col) => `${col}.ilike.%${query.trim()}%`).join(",");

      const { data, error } = await supabase
        .from("clients")
        .select(
          "id, legal_name, trade_name, pan, entity_type, registered_address, state, pincode, signatory_name, signatory_designation, signatory_contact, notes"
        )
        .eq("firm_id", firmId)
        .or(orFilter)
        .order("legal_name")
        .limit(8);

      setLoading(false);
      if (!error) {
        setResults((data as ClientRecord[]) ?? []);
        setOpen(true);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, firmId]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(client: ClientRecord) {
    onSelect(client);
    setQuery(client.legal_name);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        className="input text-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "Search by name, PAN, address, phone…"}
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto border border-paper-line bg-white shadow-md">
          {loading ? (
            <p className="px-3 py-2 text-xs text-ink-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink-500">No matching clients.</p>
          ) : (
            results.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelect(client)}
                className="block w-full border-b border-paper-line px-3 py-2 text-left last:border-b-0 hover:bg-paper-dim"
              >
                <p className="text-sm font-medium text-ink-950">{client.legal_name}</p>
                <p className="text-xs text-ink-500">
                  {[client.trade_name, client.pan, client.state].filter(Boolean).join(" · ") || "—"}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
