import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupport, useFAQ } from '@/hooks/useSupport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Search,
  FileText,
  MessageCircle,
  Mail,
  Phone,
  HelpCircle,
  Ticket,
  Book
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SupportHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { tickets, stats } = useSupport(currentUser?.id);
  const { articles } = useFAQ();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <HelpCircle className="h-8 w-8" />
          Support Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          Get help with your account, find answers, or contact our support team
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search for help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 py-6 text-lg"
        />
      </div>

      {searchQuery && filteredArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredArticles.map(article => (
              <div
                key={article.id}
                className="p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                onClick={() => navigate(`/support/knowledge-base/${article.slug}`)}
              >
                <h4 className="font-medium">{article.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-1">{article.excerpt}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/support/faq')}>
          <CardContent className="p-6">
            <HelpCircle className="h-12 w-12 mb-4 text-primary" />
            <h3 className="font-semibold text-lg mb-2">FAQ</h3>
            <p className="text-sm text-muted-foreground">Browse frequently asked questions</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/support/tickets')}>
          <CardContent className="p-6">
            <Ticket className="h-12 w-12 mb-4 text-primary" />
            <h3 className="font-semibold text-lg mb-2">My Tickets</h3>
            <p className="text-sm text-muted-foreground">View and manage support tickets</p>
            {openTickets.length > 0 && (
              <Badge variant="default" className="mt-2">{openTickets.length} open</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/support/live-chat')}>
          <CardContent className="p-6">
            <MessageCircle className="h-12 w-12 mb-4 text-primary" />
            <h3 className="font-semibold text-lg mb-2">Live Chat</h3>
            <p className="text-sm text-muted-foreground">Chat with our support team</p>
            <Badge variant="outline" className="mt-2">Available 24/7</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common support tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigate('/support/tickets/new')}
            >
              <MessageSquare className="h-4 w-4" />
              Create New Ticket
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigate('/support/knowledge-base')}
            >
              <Book className="h-4 w-4" />
              Browse Knowledge Base
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigate('/support/tickets')}
            >
              <FileText className="h-4 w-4" />
              View My Tickets
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Other ways to reach us</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">support@indigoyield.com</p>
                <p className="text-xs text-muted-foreground mt-1">Response within 24 hours</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Phone Support</p>
                <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                <p className="text-xs text-muted-foreground mt-1">Mon-Fri, 9am-5pm EST</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Live Chat</p>
                <p className="text-sm text-muted-foreground">Available 24/7</p>
                <Button
                  variant="link"
                  className="px-0 h-auto"
                  onClick={() => navigate('/support/live-chat')}
                >
                  Start Chat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Your Support Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold">{stats.total_tickets}</p>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.open_tickets}</p>
                <p className="text-sm text-muted-foreground">Open Tickets</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.resolved_tickets}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupportHubPage;
