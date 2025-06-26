import { redirect } from 'next/navigation';

// This page just redirects to the main cassino game.
// In the future, this could be a landing page for multiple games.
export default function CassinoRedirectPage() {
    redirect('/cassino/foguetinho');
}
