import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="relative block w-full max-w-md">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name, description, or URL..."
        className="w-full rounded-lg border border-slate-700 bg-slate-900/80 py-2.5 pr-3 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
      />
    </label>
  )
}
