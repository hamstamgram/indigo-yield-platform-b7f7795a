import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function WithdrawalHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: items, isLoading } = useQuery({
    queryKey: ['withdrawal_requests', searchTerm],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // Get investor_id from profiles -> investors relationship
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      // Get investor record
      const { data: investor } = await supabase
        .from('investors')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!investor) throw new Error('No investor record found');

      let query = supabase
        .from('withdrawal_requests')
        .select(`
          *,
          funds:fund_id(name, code)
        `)
        .eq('investor_id', investor.id);

      if (searchTerm) {
        query = query.ilike('notes', `%${searchTerm}%`);
      }

      const { data, error } = await query.order('request_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WithdrawalHistory</h1>
          <p className="text-muted-foreground">View withdrawal history</p>
        </div>
        <Button asChild>
          <Link to="/withdrawals/history/new">
            <Plus className="mr-2 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading...
            </div>
          ) : items && items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">
                            {(item as any).funds?.name || 'Fund'} - {item.fund_class}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'completed' ? 'bg-green-100 text-green-800' :
                            item.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            item.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.requested_amount} {item.fund_class} • {new Date(item.request_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/withdrawals/history/${item.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
              <p className="text-muted-foreground">No items found</p>
              <Button asChild>
                <Link to="/withdrawals/history/new">Create your first item</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
