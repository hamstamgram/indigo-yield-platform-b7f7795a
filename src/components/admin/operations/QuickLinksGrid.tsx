import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  category: string;
}

interface QuickLinksGridProps {
  links: QuickLink[];
}

export function QuickLinksGrid({ links }: QuickLinksGridProps) {
  const categories = Array.from(new Set(links.map((link) => link.category)));

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categoryLinks = links.filter((link) => link.category === category);
        return (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-3">{category}</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Card key={link.href} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{link.title}</CardTitle>
                          </div>
                        </div>
                        {link.badge && (
                          <Badge variant={link.badge.variant || "secondary"}>
                            {link.badge.text}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">{link.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="ghost" className="w-full justify-between">
                        <Link to={link.href}>
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
