'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TournamentForm } from '@/components/tournament/TournamentForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api-client';
import { authService } from '@/lib/auth';

export default function CreateTournamentPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check user role
    const token = authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
        
        // Redirect if not authorized
        if (payload.role !== 'TOURNAMENT_ADMIN' && payload.role !== 'SUPER_ADMIN') {
          router.push('/tournaments');
        }
      } catch (e) {
        console.error('Failed to parse token:', e);
        router.push('/tournaments');
      }
    } else {
      router.push('/login');
    }
    setLoading(false);
  }, [router]);

  const handleSubmit = async (formData: any) => {
    try {
      const response = await apiClient.post<{ id: string }>('/tournaments', formData);
      
      // Redirect to the newly created tournament
      router.push(`/tournaments/${response.id}`);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create tournament');
    }
  };

  const handleCancel = () => {
    router.push('/tournaments');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userRole || (userRole !== 'TOURNAMENT_ADMIN' && userRole !== 'SUPER_ADMIN')) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create Tournament</h1>
        <p className="text-foreground-secondary mt-2">
          Configure and create a new chess tournament
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <TournamentForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </div>
  );
}
