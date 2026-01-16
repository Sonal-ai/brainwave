"use client";

import Navbar from '@/components/Navbar/Navbar';
import Hero from '@/components/Hero/Hero';
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const { isAuthenticated, isLoading } = useAuth0();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push('/dashboard');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) return <div>Loading...</div>;

    return (
        <main>
            <Navbar />
            <Hero />
        </main>
    );
}
