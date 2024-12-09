import React from 'react';
import { signIn, useSession } from 'next-auth/react';
import Websites from './websites'; 
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const HomePage = () => {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  if (loading) {
    return <div>Loading...</div>;
  }

  if (session) {
    return <Websites />;
  }

  return (
    <main className="flex h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
      <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">UCC Dashboard</h1>
        <Card
          className="mt-8"
        >
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <button
              id="signinAzure"
              onClick={() => signIn('azure-ad')}
              className="mt-8 inline-flex items-center justify-center w-12 h-12 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              aria-label="Sign in with Microsoft"
            >
              <svg className="w-8 h-8" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
            </button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default HomePage;