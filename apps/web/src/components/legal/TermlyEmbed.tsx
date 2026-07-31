import Script from 'next/script'

interface TermlyEmbedProps {
  policyId: string
}

export function TermlyEmbed({ policyId }: TermlyEmbedProps) {
  return (
    <>
      {/* @ts-expect-error Termly requires `name` on div — not in React's HTMLAttributes types */}
      <div name="termly-embed" data-id={policyId} data-type="iframe" />
      <Script
        src="https://app.termly.io/embed-policy.min.js"
        id="termly-jssdk"
        strategy="afterInteractive"
      />
    </>
  )
}
