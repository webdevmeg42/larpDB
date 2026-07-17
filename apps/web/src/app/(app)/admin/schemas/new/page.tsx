import { Suspense } from 'react'
import NewSchemaContent from './NewSchemaContent'

export default function NewSchemaPage() {
  return (
    <Suspense>
      <NewSchemaContent />
    </Suspense>
  )
}
