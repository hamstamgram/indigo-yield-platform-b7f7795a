import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MessageSquare, Clock, CheckCircle, AlertCircle, User, Calendar } from "lucide-react";

interface SupportTicket {
  id: string;
  title: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  user_id: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  response?: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function AdminSupportQueuePage() {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [response, setResponse] = useState<string>("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const queryClient = useQueryClient();

  // Mock support tickets data - in real implementation, this would be from a support_tickets table
  const mockTickets: SupportTicket[] = [
    {
      id: "1",
      title: "Unable to view my withdrawal request status",
      message: "I submitted a withdrawal request 3 days ago but can't see any updates on the status. Could you please help me check what's happening?",
      status: "open",
      priority: "medium",
      category: "Withdrawal",
      user_id: "user1",
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-15T10:30:00Z",
      profiles: {
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com"
      }
    },
    {
      id: "2", 
      title: "Question about yield calculations",
      message: "I notice my yield seems lower this month compared to last month. Can you explain how the daily yield is calculated and applied to my account?",
      status: "in_progress",
      priority: "low",
      category: "Yield",
      user_id: "user2",
      assigned_to: "admin1",
      created_at: "2024-01-14T14:20:00Z",
      updated_at: "2024-01-15T09:15:00Z",
      response: "Hi Sarah, I'm looking into your yield calculations. Will get back to you shortly with a detailed breakdown.",
      profiles: {
        first_name: "Sarah",
        last_name: "Smith", 
        email: "sarah.smith@example.com"
      }
    },
    {
      id: "3",
      title: "Account access issues after password reset",
      message: "I reset my password yesterday but I'm still unable to log into my account. The system says my credentials are invalid.",
      status: "open",
      priority: "high",
      category: "Account",
      user_id: "user3",
      created_at: "2024-01-15T08:45:00Z",
      updated_at: "2024-01-15T08:45:00Z",
      profiles: {
        first_name: "Michael",
        last_name: "Johnson",
        email: "michael.j@example.com"
      }
    }
  ];

  // Simulate fetching support tickets
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['support-tickets', filterStatus, filterPriority],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredTickets = mockTickets;
      
      if (filterStatus !== "all") {
        filteredTickets = filteredTickets.filter(ticket => ticket.status === filterStatus);
      }
      
      if (filterPriority !== "all") {
        filteredTickets = filteredTickets.filter(ticket => ticket.priority === filterPriority);
      }
      
      return filteredTickets;
    }
  });

  // Update ticket status mutation
  const updateTicketMutation = useMutation({
    mutationFn: async (params: { ticketId: string; status: string; response?: string }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Ticket updated successfully");
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setSelectedTicket(null);
      setResponse("");
      setNewStatus("");
    },
    onError: (error) => {
      toast.error(`Failed to update ticket: ${error.message}`);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Open</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-blue-600"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'resolved':
        return <Badge variant="default" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'closed':
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="outline" className="text-red-600">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-yellow-600">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-green-600">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const handleUpdateTicket = () => {
    if (!selectedTicket || !newStatus) {
      toast.error("Please select a status");
      return;
    }

    updateTicketMutation.mutate({
      ticketId: selectedTicket.id,
      status: newStatus,
      response: response
    });
  };

  const getTicketCounts = () => {
    const open = mockTickets.filter(t => t.status === 'open').length;
    const inProgress = mockTickets.filter(t => t.status === 'in_progress').length;
    const urgent = mockTickets.filter(t => t.priority === 'urgent').length;
    
    return { open, inProgress, urgent };
  };

  const counts = getTicketCounts();

  if (ticketsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support Queue</h1>
        <p className="text-muted-foreground">
          Manage investor support requests and inquiries
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{counts.open}</div>
                <div className="text-sm text-muted-foreground">Open Tickets</div>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{counts.inProgress}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{counts.urgent}</div>
                <div className="text-sm text-muted-foreground">Urgent</div>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Status Filter</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Priority Filter</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Support Tickets
          </CardTitle>
          <CardDescription>
            Review and respond to investor support requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tickets?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No support tickets found
              </div>
            ) : (
              tickets?.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{ticket.title}</h3>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                        <Badge variant="outline">{ticket.category}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {ticket.profiles.first_name} {ticket.profiles.last_name} ({ticket.profiles.email})
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <p className="text-sm mb-3">{ticket.message}</p>
                      
                      {ticket.response && (
                        <div className="bg-muted p-3 rounded-md">
                          <div className="text-xs text-muted-foreground mb-1">Admin Response:</div>
                          <div className="text-sm">{ticket.response}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setNewStatus(ticket.status);
                            setResponse(ticket.response || "");
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Respond
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Respond to Support Ticket</DialogTitle>
                          <DialogDescription>
                            Ticket from {ticket.profiles.first_name} {ticket.profiles.last_name}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="bg-muted p-3 rounded-md">
                            <div className="font-medium mb-2">{ticket.title}</div>
                            <div className="text-sm">{ticket.message}</div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Response</Label>
                            <Textarea
                              value={response}
                              onChange={(e) => setResponse(e.target.value)}
                              placeholder="Type your response here..."
                              rows={4}
                            />
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            onClick={handleUpdateTicket}
                            disabled={updateTicketMutation.isPending}
                          >
                            {updateTicketMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Update Ticket
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
