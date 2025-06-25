'use server';

import { AppLayout } from "@/components/app-layout";
import { getAvailableLeagues } from "@/actions/bet-actions";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { StoreClient } from "@/components/store-client";
import { getStoreItems } from "@/actions/store-actions";

export default async function StorePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/');
    }

    const [availableLeagues, items] = await Promise.all([
        getAvailableLeagues(),
        getStoreItems()
    ]);
    
    return (
        <AppLayout availableLeagues={availableLeagues}>
            <StoreClient initialItems={items} />
        </AppLayout>
    );
}
