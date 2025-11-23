import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PerformanceDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: item, isLoading } = useQuery({
    queryKey: ["daily_nav", id],
    queryFn: async () => {
      if (!id) throw new Error("No ID provided");

      // @ts-ignore - Type instantiation issue with daily_nav table
      const result = await supabase
        .from("daily_nav")
        .select("id, date, nav_value, aum, shares_outstanding, created_at, updated_at")
        .eq("id", id)
        .maybeSingle();

      if (result.error) throw result.error;
      if (!result.data) throw new Error("Performance data not found");

      return result.data as any;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Item not found</p>
          <Button asChild>
            <Link to="/dashboard/performance">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link to="/dashboard/performance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {(item as any).name || (item as any).title}
              </CardTitle>
              <CardDescription>
                Created {new Date((item as any).created_at).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge>{(item as any).status || "Active"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">ID</p>
              <p className="font-mono text-sm">{(item as any).id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="capitalize">{(item as any).status || "Active"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <p>{new Date((item as any).created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Updated</p>
              <p>
                {new Date((item as any).updated_at || (item as any).created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {(item as any).description && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Description</p>
              <p>{(item as any).description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
