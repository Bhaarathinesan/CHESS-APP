'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface CollegeDomain {
  id: string;
  domain: string;
  collegeName: string;
  isActive: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CollegeDomainsPage() {
  const [domains, setDomains] = useState<CollegeDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newCollegeName, setNewCollegeName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/college-domains', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch college domains');
      }

      const data = await response.json();
      setDomains(data.domains);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDomain.trim() || !newCollegeName.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/college-domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          domain: newDomain.trim(),
          collegeName: newCollegeName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add domain');
      }

      // Reset form and close modal
      setNewDomain('');
      setNewCollegeName('');
      setShowAddModal(false);
      
      // Refresh domains list
      await fetchDomains();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveDomain = async (domainId: string, domainName: string) => {
    if (!confirm(`Are you sure you want to remove ${domainName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/college-domains/${domainId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove domain');
      }

      // Refresh domains list
      await fetchDomains();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove domain');
    }
  };

  const handleToggleStatus = async (domainId: string) => {
    try {
      const response = await fetch(`/api/admin/college-domains/${domainId}/toggle`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle domain status');
      }

      // Refresh domains list
      await fetchDomains();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle domain status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading college domains...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">College Domain Management</h1>
        <Button onClick={() => setShowAddModal(true)}>
          Add Domain
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Approved College Domains</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage the list of approved college email domains for registration
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Domain</th>
                <th className="text-left py-3 px-4">College Name</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Users</th>
                <th className="text-left py-3 px-4">Added</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No college domains found. Add one to get started.
                  </td>
                </tr>
              ) : (
                domains.map((domain) => (
                  <tr key={domain.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm">{domain.domain}</td>
                    <td className="py-3 px-4">{domain.collegeName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          domain.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {domain.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{domain.userCount}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(domain.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleStatus(domain.id)}
                      >
                        {domain.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveDomain(domain.id, domain.domain)}
                        disabled={domain.userCount > 0}
                        title={
                          domain.userCount > 0
                            ? 'Cannot remove domain with registered users'
                            : 'Remove domain'
                        }
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Domain Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewDomain('');
          setNewCollegeName('');
        }}
        title="Add College Domain"
      >
        <form onSubmit={handleAddDomain} className="space-y-4">
          <div>
            <label htmlFor="domain" className="block text-sm font-medium mb-1">
              Domain
            </label>
            <Input
              id="domain"
              type="text"
              placeholder="e.g., university.edu"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              required
              pattern="[a-z0-9.-]+\.[a-z]{2,}"
              title="Enter a valid domain (e.g., university.edu)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the email domain without @ symbol (e.g., stanford.edu)
            </p>
          </div>

          <div>
            <label htmlFor="collegeName" className="block text-sm font-medium mb-1">
              College Name
            </label>
            <Input
              id="collegeName"
              type="text"
              placeholder="e.g., Stanford University"
              value={newCollegeName}
              onChange={(e) => setNewCollegeName(e.target.value)}
              required
              maxLength={255}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setNewDomain('');
                setNewCollegeName('');
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Domain'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
