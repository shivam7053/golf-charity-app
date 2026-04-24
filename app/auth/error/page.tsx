export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-red-600">Authentication Error</h2>
        <p className="text-gray-700">Something went wrong during the authentication process. Please try again.</p>
        <a href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">Go to Login</a>
      </div>
    </div>
  );
}
