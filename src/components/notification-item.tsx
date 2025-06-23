import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

interface NotificationItemProps {
    notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
    return (
        <div className={cn(
            "flex flex-col items-start gap-1 p-4 cursor-pointer transition-colors hover:bg-accent w-full",
            !notification.read && "bg-accent/50 hover:bg-accent"
        )}>
            <div className='flex items-center w-full'>
                <p className={cn(
                    "text-sm font-medium",
                    !notification.read ? "text-foreground" : "text-muted-foreground"
                )}>{notification.title}</p>
                <p className="ml-auto text-xs text-muted-foreground">{notification.time}</p>
            </div>
            <p className={cn(
                "text-xs w-full text-left",
                !notification.read ? "text-foreground/80" : "text-muted-foreground"
            )}>{notification.description}</p>
        </div>
    );
}
