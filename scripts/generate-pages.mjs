#!/usr/bin/env node

/**
 * Page Template Generator for Indigo Yield Platform
 * Generates React page components with TypeScript, Shadcn/ui, and Supabase integration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');

// Page templates by type
const templates = {
  list: (name, route, description) => `import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function ${name}Page() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: items, isLoading } = useQuery({
    queryKey: ['${route.toLowerCase()}', searchTerm],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      let query = supabase
        .from('${route.toLowerCase()}')
        .select('*')
        .eq('investor_id', user.id);

      if (searchTerm) {
        query = query.ilike('name', \`%\${searchTerm}%\`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">${name}</h1>
          <p className="text-muted-foreground">${description}</p>
        </div>
        <Button asChild>
          <Link to="${route}/new">
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
                      <div>
                        <h3 className="font-semibold">{item.name || item.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={\`${route}/\${item.id}\`}>
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
                <Link to="${route}/new">Create your first item</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
`,

  form: (name, route, description) => `import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ${name}Page() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('${route.toLowerCase()}')
        .insert({
          ...data,
          investor_id: user.id,
        });

      if (error) throw error;

      toast.success('${name} created successfully');
      navigate('${route}');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to create ${name.toLowerCase()}');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">${name}</h1>
        <p className="text-muted-foreground">${description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Details</CardTitle>
          <CardDescription>Fill out the form below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register('name')}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register('description')}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('${route}')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
`,

  details: (name, route, description) => `import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ${name}DetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading } = useQuery({
    queryKey: ['${route.toLowerCase()}', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');

      const { data, error } = await supabase
        .from('${route.toLowerCase()}')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
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
            <Link to="${route}">
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
          <Link to="${route}">
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
              <CardTitle className="text-2xl">{item.name || item.title}</CardTitle>
              <CardDescription>
                Created {new Date(item.created_at).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge>{item.status || 'Active'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">ID</p>
              <p className="font-mono text-sm">{item.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="capitalize">{item.status || 'Active'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <p>{new Date(item.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Updated</p>
              <p>{new Date(item.updated_at || item.created_at).toLocaleString()}</p>
            </div>
          </div>

          {item.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Description</p>
              <p>{item.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
`,
};

// Page definitions
const pages = [
  // Transactions Module
  { name: 'Transactions', route: '/transactions', type: 'list', description: 'View and manage all transactions' },
  { name: 'TransactionDetails', route: '/transactions', type: 'details', description: 'Transaction details and history' },
  { name: 'NewDeposit', route: '/transactions/deposit', type: 'form', description: 'Make a new deposit to your account' },
  { name: 'PendingTransactions', route: '/transactions/pending', type: 'list', description: 'View pending transactions' },
  { name: 'RecurringDeposits', route: '/transactions/recurring', type: 'list', description: 'Manage recurring deposits' },

  // Performance Analytics
  { name: 'Performance', route: '/dashboard/performance', type: 'details', description: 'Portfolio performance analytics' },

  // Withdrawals
  { name: 'NewWithdrawal', route: '/withdrawals/new', type: 'form', description: 'Request a new withdrawal' },
  { name: 'WithdrawalHistory', route: '/withdrawals/history', type: 'list', description: 'View withdrawal history' },

  // Documents
  { name: 'DocumentsHub', route: '/documents', type: 'list', description: 'Manage your documents' },
  { name: 'TaxDocuments', route: '/documents/tax', type: 'list', description: 'Tax documents and forms' },

  // Reports
  { name: 'Reports', route: '/reports', type: 'list', description: 'Generate and view reports' },
  { name: 'PerformanceReport', route: '/reports/performance', type: 'details', description: 'Performance analysis report' },
];

// Generate pages
function generatePages() {
  pages.forEach(({ name, route, type, description }) => {
    const template = templates[type];
    if (!template) {
      console.error(`Unknown template type: ${type}`);
      return;
    }

    const content = template(name, route, description);
    const moduleName = route.split('/')[1];
    const dirPath = path.join(srcDir, 'pages', moduleName);
    const filePath = path.join(dirPath, `${name}Page.tsx`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write file
    fs.writeFileSync(filePath, content);
    console.log(`✓ Generated: ${filePath.replace(srcDir, 'src')}`);
  });

  console.log(`\n✓ Successfully generated ${pages.length} pages`);
}

// Run generator
generatePages();
