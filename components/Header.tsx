// components/Header.tsx

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';

const Header = () => {
  const { data: session, status } = useSession();

  return (
    <header className="flex justify-between items-center p-4 bg-blue-600 text-white shadow-md">
      <Link href="/">
        <a className="text-2xl font-bold hover:text-gray-200 transition">Anonymous Chat</a>
      </Link>
      <nav className="flex items-center space-x-4">
        <Link href="/">
          <a className="hover:text-gray-200 transition">Home</a>
        </Link>
        {/* Additional navigation links can be added here */}
        {status === 'loading' ? (
          <p>Loading...</p>
        ) : session ? (
          <div className="flex items-center space-x-4">
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="User Avatar"
                className="w-10 h-10 rounded-full"
              />
            )}
            <span className="hidden sm:block">{session.user?.name}</span>
            <button
              onClick={() => signOut()}
              className="px-3 py-1 bg-red-500 rounded-md hover:bg-red-600 transition"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn()}
            className="px-3 py-1 bg-green-500 rounded-md hover:bg-green-600 transition"
          >
            Sign In
          </button>
        )}
      </nav>
    </header>
  );
};

export default Header;
