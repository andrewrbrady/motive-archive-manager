'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddAssetPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description, location }),
      });

      if (!response.ok) {
        throw new Error('Failed to add asset');
      }

      router.push('/raw');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-24">
      <h1 className="text-2xl font-bold mb-4">Add New Asset</h1>
      {error && <div className="text-red-500 mb-4">Error: {error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Location</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required className="w-full border rounded p-2" />
        </div>
        <button type="submit" disabled={loading} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
          {loading ? 'Adding...' : 'Add Asset'}
        </button>
      </form>
    </div>
  );
}
