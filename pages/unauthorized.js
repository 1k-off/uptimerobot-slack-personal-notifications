import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function UnauthorizedPage() {
    const { data: session } = useSession();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
            <p className="text-lg mb-6">
                {session ?
                    `You don't have permission to access the admin area, ${session.user.name}.` :
                    'You need to be logged in as an administrator to access this area.'}
            </p>
            <Link href="/">
                <div className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">
                    Return to Home
                </div>
            </Link>
        </div>
    );
}
