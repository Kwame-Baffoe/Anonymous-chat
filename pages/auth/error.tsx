import { useRouter } from 'next/router'
import Link from 'next/link'

const AuthError = () => {
  const router = useRouter()
  const { error } = router.query

  let errorMessage = 'An error occurred during authentication'

  if (error === 'CredentialsSignin') {
    errorMessage = 'Invalid email or password'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="text-red-500 mb-4">{errorMessage}</p>
        <Link href="/login" className="text-blue-500 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  )
}

export default AuthError