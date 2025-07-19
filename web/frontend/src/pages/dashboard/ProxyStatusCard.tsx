import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ClipboardCopy, AlertCircle, ServerOff, Timer, ArrowRightLeft,
    LogIn, LogOut, RefreshCw, MapPin, Tag, Server, Download, Upload, Hourglass, Loader2
} from 'lucide-react';
import { type ProxyDetails } from "@/types/dashboard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Sub-components for the new design ---

interface DetailItemProps {
    label: string;
    icon: React.ElementType;
    children: React.ReactNode;
    className?: string;
}

/**
 * A compact, flexible row item for displaying a piece of data.
 */
const DetailItem = ({ label, icon: Icon, children, className }: DetailItemProps) => {
    if (!children) return null;
    const content = (
        <div className="text-sm font-medium">
            {children}
        </div>
    );

    return (
        <div className={cn("flex items-center justify-between group", className)}>
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            {content}
        </div>
    );
};


/**
 * A memoized countdown timer to prevent unnecessary re-renders.
 */
const Countdown = React.memo(({ to }: { to: string }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(to) - +new Date();
        if (difference <= 0) return { minutes: 0, seconds: 0 };
        return {
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
        };
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearInterval(timer);
    }, [to]);

    return (
        <span className="font-mono text-sm">{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
    );
});


// --- Main Card Component ---

const StoppedContent = () => (
    <motion.div
        key="stopped"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
    >
        <CardContent className="flex flex-col justify-center items-center text-center py-12">
            <div className="bg-muted rounded-full p-3 w-fit mb-4">
                <ServerOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold">Proxy Service Stopped</p>
            <p className="text-sm text-muted-foreground">Start the proxy to see live details.</p>
        </CardContent>
    </motion.div>
);

const RunningContent = ({ details }: { details: ProxyDetails }) => {
    const { inbound, activeOutbound, rotationInterval, rotationStatus, nextRotationTime, totalConfigs } = details;
    const handleCopy = (label: string, value: string) => navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied!`));

    const getRotationStatusBadge = () => {
        const statusKey = rotationStatus || 'idle';
        const content = () => {
            switch (rotationStatus) {
                case 'testing': return <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Testing</>;
                case 'switching': return <><ArrowRightLeft className="mr-1.5 h-3 w-3 animate-pulse" />Switching</>;
                case 'stalled': return <><Hourglass className="mr-1.5 h-3 w-3" />Stalled</>;
                default: return <Countdown to={nextRotationTime} />;
            }
        }
        const variant = (): "default" | "secondary" | "destructive" | "outline" => {
            switch (rotationStatus) {
                case 'testing': return 'secondary';
                case 'switching': return 'secondary';
                case 'stalled': return 'destructive';
                default: return 'outline';
            }
        }
        const colorClass = () => {
            switch (rotationStatus) {
                case 'testing': return "bg-blue-500/20 text-blue-400 border-blue-500/30";
                case 'switching': return "bg-purple-500/20 text-purple-400 border-purple-500/30";
                case 'stalled': return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
                default: return "";
            }
        }

        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={statusKey}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                >
                    <Badge variant={variant()} className={cn(colorClass())}>
                        {content()}
                    </Badge>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <motion.div
            key="running"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
             <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border rounded-lg p-4">
                    {/* Inbound Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 font-semibold text-base"><LogIn className="size-4 text-muted-foreground" /><span>Inbound Listener</span></div>
                        <div className="space-y-2 pl-6">
                             <DetailItem icon={Badge} label="Protocol"><span className="font-mono text-xs font-bold">{inbound.Protocol.toUpperCase()}</span></DetailItem>
                            <DetailItem icon={Server} label="Address"><span className="font-mono text-xs">{`${inbound.Address}:${inbound.Port}`}</span></DetailItem>
                            <DetailItem icon={ClipboardCopy} label="Link">
                                <Button variant="secondary" size="sm" className="h-7" onClick={() => handleCopy('Inbound Link', inbound.OrigLink)}>
                                    <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
                                    Copy
                                </Button>
                            </DetailItem>
                        </div>
                    </div>

                    {/* Outbound Section */}
                    <div className="space-y-3 md:border-l md:pl-6 -ml-2 md:-ml-0">
                         <div className="flex items-center gap-2 font-semibold text-base"><LogOut className="size-4 text-muted-foreground" /><span>Active Outbound</span></div>
                        {activeOutbound && activeOutbound.protocol ? (
                            <div className="space-y-2 pl-6">
                                <DetailItem icon={Tag} label="Remark"><span className="font-mono text-xs truncate max-w-[150px]">{activeOutbound.protocol.remark || 'N/A'}</span></DetailItem>
                                <DetailItem icon={MapPin} label="Location"><span className="font-mono text-xs">{activeOutbound.location !== 'null' ? activeOutbound.location : 'N/A'}</span></DetailItem>
                                <DetailItem icon={Timer} label="Delay"><Badge variant="secondary">{activeOutbound.delay}ms</Badge></DetailItem>
                                <DetailItem icon={ArrowRightLeft} label="Speed (D/U)">
                                    <div className="flex items-center gap-1.5 font-mono text-xs">
                                        <div className="flex items-center gap-1"><Download className="size-3 text-muted-foreground" /><span>{activeOutbound.download > 0 ? activeOutbound.download.toFixed(2) : '-'}</span></div>
                                        <span className="text-muted-foreground">/</span>
                                        <div className="flex items-center gap-1"><Upload className="size-3 text-muted-foreground" /><span>{activeOutbound.upload > 0 ? activeOutbound.upload.toFixed(2) : '-'}</span></div>
                                        <span className="text-xs text-muted-foreground">Mbps</span>
                                    </div>
                                </DetailItem>
                                <DetailItem icon={ClipboardCopy} label="Link">
                                    <Button variant="secondary" size="sm" className="h-7" onClick={() => handleCopy('Outbound Link', activeOutbound.link)}>
                                        <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
                                        Copy
                                    </Button>
                                </DetailItem>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm pl-6 h-full">
                                <AlertCircle className="h-4 w-4" />
                                <span>Waiting for first active config...</span>
                            </div>
                        )}
                    </div>
                </div>
                 {/* Rotation Section */}
                 <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-base"><RefreshCw className="size-4 text-muted-foreground" /><span>Rotation</span></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 pl-6">
                        <DetailItem icon={AlertCircle} label="Status">{totalConfigs > 1 ? getRotationStatusBadge() : <Badge variant="outline">Disabled</Badge>}</DetailItem>
                        {totalConfigs > 1 && <DetailItem icon={Timer} label="Interval"><span className="font-mono text-xs">{rotationInterval}s</span></DetailItem>}
                        <DetailItem icon={Server} label="Total Configs"><span className="font-mono text-xs">{totalConfigs}</span></DetailItem>
                    </div>
                </div>
            </CardContent>
        </motion.div>
    )
}

export function ProxyStatusCard({ details }: { details: ProxyDetails | null }) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Live Proxy Status</CardTitle>
                <CardDescription>Details of the currently active proxy instance.</CardDescription>
            </CardHeader>
            <AnimatePresence mode="wait">
                {!details
                    ? <StoppedContent />
                    : <RunningContent details={details} />
                }
            </AnimatePresence>
        </Card>
    );
}