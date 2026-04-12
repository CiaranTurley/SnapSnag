// /verify redirects to /verify-report (canonical URL)
import { redirect } from 'next/navigation'
export default function VerifyRedirect() {
  redirect('/verify-report')
}
