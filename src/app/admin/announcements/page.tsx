'use server';

import AdminPostsClient from "@/components/admin-announcements-client";
import { getAdminPosts, getAuthors } from "@/actions/admin-actions";

export default async function AdminPostsPage() {
    const [posts, authors] = await Promise.all([
        getAdminPosts(),
        getAuthors()
    ]);
    return <AdminPostsClient initialPosts={posts} initialAuthors={authors} />;
}
