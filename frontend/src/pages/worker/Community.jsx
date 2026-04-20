import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Flame,
  Loader2,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { grievanceAPI } from "@/services/api";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useAuth } from "@/context/AuthContext";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

function formatRelativeTime(value) {
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round((now - then) / 60000));

  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day ago`;
}

function formatCategory(value) {
  return String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPostTone(post) {
  if (post.status === "resolved") return "success";
  if (post.tags?.length) return "alert";
  return "tip";
}

function getInitials(name) {
  return String(name || "FG")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Community() {
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState({ topCategoriesThisWeek: [] });
  const [form, setForm] = useState({
    category: "",
    description: "",
    isPublic: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  const loadCommunityData = async () => {
    try {
      setError("");
      const [feedResponse, statsResponse] = await Promise.all([
        grievanceAPI.get("/grievances/feed"),
        grievanceAPI.get("/grievances/stats"),
      ]);

      setFeed(feedResponse.data?.grievances || []);
      setStats(statsResponse.data || { topCategoriesThisWeek: [] });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Unable to load the community board right now."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCommunityData();
  }, []);

  const topTopics = useMemo(() => stats.topCategoriesThisWeek || [], [stats]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      setSubmitMessage("");
      await grievanceAPI.post("/grievances", {
        category: form.category,
        description: form.description,
        isPublic: form.isPublic,
      });

      setForm({
        category: "",
        description: "",
        isPublic: true,
      });
      setSubmitMessage("Your community post was saved to the database.");
      await loadCommunityData();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Unable to publish your community post."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Community Board</h1>
        <p className="text-muted-foreground">
          Live worker posts from the grievance database, plus a worker-only form to add new community reports.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                Trending Topics <TrendingUp className="h-4 w-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topTopics.length ? (
                <ul className="space-y-3 text-sm">
                  {topTopics.map((topic) => (
                    <li key={topic.category} className="flex justify-between">
                      <span>#{formatCategory(topic.category)}</span>
                      <span className="text-muted-foreground">{topic.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Trending topics will appear as workers post.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PlusCircle className="h-4 w-4" />
                New Community Post
              </CardTitle>
              <CardDescription>
                Save a new worker complaint or tip directly to the grievance service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm font-medium">
                  Category
                  <Input
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, category: event.target.value }))
                    }
                    placeholder="payout delay, unsafe assignment..."
                    className="mt-1"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Description
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={5}
                    placeholder="Share what happened so other workers can see the pattern."
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={form.isPublic}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, isPublic: event.target.checked }))
                    }
                  />
                  Publish to the public worker community board
                </label>
                {submitMessage ? <p className="text-sm text-emerald-600">{submitMessage}</p> : null}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Post to Community
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge>{user?.role || "worker"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Worker ID</span>
                <span className="font-medium">{user?._id || "N/A"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Feed</CardTitle>
              <CardDescription>
                Public community posts fetched from MongoDB through the grievance service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

              {isLoading ? (
                <div className="flex min-h-[320px] items-center justify-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading community posts...
                </div>
              ) : (
                <ScrollArea className="h-[720px] pr-4">
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    {feed.length ? (
                      feed.map((post) => {
                        const tone = getPostTone(post);
                        const isOwnPost = String(post.worker?._id || "") === String(user?._id || "");

                        return (
                          <motion.div key={post._id} variants={itemVariants}>
                            <Card className="transition-shadow hover:shadow-md">
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarFallback>
                                        {getInitials(post.worker?.fullName || "FairGig")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold text-foreground">
                                          {post.worker?.fullName || "FairGig Worker"}
                                        </h3>
                                        <Badge variant="secondary" className="capitalize">
                                          {post.worker?.role || "worker"}
                                        </Badge>
                                        {isOwnPost ? <Badge variant="outline">You</Badge> : null}
                                        <Badge variant="outline">{formatCategory(post.category)}</Badge>
                                      </div>
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        {formatRelativeTime(post.createdAt)}
                                      </p>
                                    </div>
                                  </div>

                                  {tone === "alert" ? (
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                  ) : null}
                                  {tone === "tip" ? <Flame className="h-5 w-5 text-orange-500" /> : null}
                                  {tone === "success" ? (
                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                  ) : null}
                                </div>

                                <div className="mt-4 text-sm leading-relaxed text-foreground/90">
                                  {post.description}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="capitalize">
                                    Status: {post.status}
                                  </Badge>
                                  {post.tags?.map((tag) => (
                                    <Badge key={`${post._id}-${tag}`} variant="secondary">
                                      {formatCategory(tag)}
                                    </Badge>
                                  ))}
                                </div>

                                <div className="mt-5 flex items-center gap-5 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <MessageSquare className="h-4 w-4" />
                                    Community report
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <TrendingUp className="h-4 w-4" />
                                    {post.worker?.demographics?.cityZone || "No zone"}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })
                    ) : (
                      <Card>
                        <CardContent className="py-14 text-center text-sm text-muted-foreground">
                          No public community posts are available yet.
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
