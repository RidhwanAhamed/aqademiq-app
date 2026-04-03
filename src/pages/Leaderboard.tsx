import { useStreakLeaderboard, LeaderboardEntry } from "@/hooks/useStreakLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award, Flame } from "lucide-react";

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-medium text-muted-foreground">{rank}</span>;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useStreakLeaderboard();

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Flame className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Streak Ranking</h1>
          <p className="text-sm text-muted-foreground">
            See how your study streak compares with others
          </p>
        </div>
      </div>

      {/* Current user rank card */}
      {data?.currentUser && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <RankIcon rank={data.currentUser.rank} />
              <div>
                <p className="font-semibold text-foreground">Your Rank</p>
                <p className="text-sm text-muted-foreground">
                  {data.currentUser.maxStreak} day streak
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              #{data.currentUser.rank}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Streaks</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-8">
              Failed to load leaderboard. Please try again later.
            </p>
          ) : !data?.leaderboard?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No streak data yet. Start studying to get on the board!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Streak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leaderboard.map((entry: LeaderboardEntry) => {
                  const isCurrentUser = entry.userId === user?.id;
                  return (
                    <TableRow
                      key={entry.userId}
                      className={isCurrentUser ? "bg-primary/5 font-medium" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center justify-center w-8">
                          <RankIcon rank={entry.rank} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={isCurrentUser ? "text-primary font-semibold" : "text-foreground"}>
                            {entry.name}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span>{entry.maxStreak} days</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
