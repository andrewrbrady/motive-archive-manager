'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddAssetPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locations, setLocations] = useState(['']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLocationChange = (index: number, value: string) => {
    const newLocations = [...locations];
    newLocations[index] = value;
    setLocations(newLocations);
  };

  const addLocation = () => {
    setLocations([...locations, '']);
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

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
        body: JSON.stringify({ name, description, location: locations }),
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
          <label className="block text-sm font-medium">Locations</label>
          {locations.map((location, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={location}
                onChange={(e) => handleLocationChange(index, e.target.value)}
                required
                className="w-full border rounded p-2"
              />
              <button type="button" onClick={() => removeLocation(index)} className="text-red-500">Remove</button>
            </div>
          ))}
          <button type="button" onClick={addLocation} className="bg-blue-500 text-white px-4 py-2 rounded">Add Location</button>
        </div>
        <button type="submit" disabled={loading} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
          {loading ? 'Adding...' : 'Add Asset'}
        </button>
      </form>
    </div>
  );
}
