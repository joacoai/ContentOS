import { HooksDatabase } from "@/components/hooks/HooksDatabase"

export const dynamic = 'force-dynamic'

export default function HooksPage() {
  return (
    <div className="p-6">
      <HooksDatabase />
    </div>
  )
}
