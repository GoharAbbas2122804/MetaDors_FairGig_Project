import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Flame, TrendingUp, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const posts = [
  {
    id: 1,
    author: "Alex J.",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
    role: "Advocate",
    timestamp: "10 mins ago",
    content: "DoorDash is offering an extra $2.50/delivery downtown between 4-6 PM today due to the rain. Stay safe out there!",
    likes: 12,
    comments: 3,
    type: "tip",
  },
  {
    id: 2,
    author: "Maria S.",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
    role: "Verified Worker",
    timestamp: "1 hr ago",
    content: "Anyone else noticing Uber's new algorithm suppressing upfront fare transparency? I've filed an anomaly report. Pls share your logs!",
    likes: 45,
    comments: 18,
    type: "alert",
  },
  {
    id: 3,
    author: "David L.",
    avatar: "https://i.pravatar.cc/150?u=a04258a2462d826712d",
    role: "Top Contributor",
    timestamp: "3 hrs ago",
    content: "Just uploaded my CSV for March. Generating the income certificate really helped me secure my new apartment lease today. Thanks FairGig community!",
    likes: 89,
    comments: 5,
    type: "success",
  },
  {
    id: 4,
    author: "Jessica T.",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026703d",
    role: "Verified Worker",
    timestamp: "5 hrs ago",
    content: "Avoid 5th avenue if delivering right now, massive roadworks blocking all eastbound traffic. Delayed me for 20 mins on a single order.",
    likes: 24,
    comments: 2,
    type: "alert",
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function Community() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Community Board</h1>
        <p className="text-muted-foreground">Exchange tips, report dark patterns, and support your fellow gig workers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Stats/Filters Pane */}
        <div className="md:col-span-1 space-y-4">
          <Card className="bg-primary/5 border-primary/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                Trending <TrendingUp className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between hover:text-primary cursor-pointer transition-colors">
                  <span>#UberFares</span>
                  <span className="text-muted-foreground">1.2k</span>
                </li>
                <li className="flex justify-between hover:text-primary cursor-pointer transition-colors">
                  <span>#RainSurge</span>
                  <span className="text-muted-foreground">845</span>
                </li>
                <li className="flex justify-between hover:text-primary cursor-pointer transition-colors">
                  <span>#EvictionNotice</span>
                  <span className="text-muted-foreground">620</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Main Feed Area */}
        <div className="md:col-span-3">
          <ScrollArea className="h-[650px] pr-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {posts.map((post) => (
                <motion.div key={post.id} variants={itemVariants} whileHover={{ scale: 1.01 }} className="transform transition-transform">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={post.avatar} alt={post.author} />
                            <AvatarFallback>{post.author.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{post.author}</h3>
                              {post.role === "Advocate" && (
                                <Badge variant="default" className="text-[10px] h-5 px-1.5 py-0 bg-blue-600 hover:bg-blue-700">Advocate</Badge>
                              )}
                              {post.role === "Verified Worker" && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 py-0 border border-muted-foreground/30">Verified</Badge>
                              )}
                              {post.role === "Top Contributor" && (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 py-0 text-amber-600 border-amber-600/30 bg-amber-50">Top</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{post.timestamp}</p>
                          </div>
                        </div>
                        {post.type === "alert" && <AlertTriangle className="w-5 h-5 text-destructive" />}
                        {post.type === "tip" && <Flame className="w-5 h-5 text-orange-500" />}
                      </div>
                      
                      <div className="mt-4 text-sm text-foreground/90 leading-relaxed font-medium">
                        {post.content}
                      </div>
                      
                      <div className="mt-5 flex items-center gap-6 text-muted-foreground text-sm font-medium">
                        <button className="flex items-center gap-1.5 hover:text-primary transition-colors group">
                          <div className="w-8 h-8 rounded-full border border-transparent group-hover:bg-primary/10 group-hover:border-primary/20 flex items-center justify-center transition-all">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                          {post.likes}
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-foreground transition-colors group">
                          <div className="w-8 h-8 rounded-full border border-transparent group-hover:bg-muted group-hover:border-border flex items-center justify-center transition-all">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          {post.comments} comments
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
