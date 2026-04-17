import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const NotesContext = createContext();

export function NotesProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get('/notes');
      setNotes(data);
    } catch (err) {
      console.error('Notes fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const addNote = useCallback(async (note) => {
    try {
      const created = await api.post('/notes', note);
      setNotes(prev => [created, ...prev]);
    } catch (err) {
      console.error('Add note error:', err);
    }
  }, []);

  const updateNote = useCallback(async (id, updates) => {
    try {
      const updated = await api.put(`/notes/${id}`, updates);
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
    } catch (err) {
      console.error('Update note error:', err);
    }
  }, []);

  const deleteNote = useCallback(async (id) => {
    try {
      await api.delete(`/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Delete note error:', err);
    }
  }, []);

  const togglePin = useCallback(async (id) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    try {
      const updated = await api.put(`/notes/${id}`, { pinned: !note.pinned });
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
    } catch (err) {
      console.error('Toggle pin error:', err);
    }
  }, [notes]);

  const duplicateNote = useCallback(async (id) => {
    try {
      const created = await api.post(`/notes/${id}/duplicate`);
      setNotes(prev => [created, ...prev]);
    } catch (err) {
      console.error('Duplicate note error:', err);
    }
  }, []);

  const clearAllNotes = useCallback(async () => {
    for (const note of notes) {
      try { await api.delete(`/notes/${note.id}`); } catch {}
    }
    setNotes([]);
  }, [notes]);

  const allTags = [...new Set(notes.flatMap(n => n.tags || []))];

  // Sort: pinned first, then by updatedAt
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  return (
    <NotesContext.Provider value={{ notes: sortedNotes, addNote, updateNote, deleteNote, togglePin, duplicateNote, clearAllNotes, allTags, loading }}>
      {children}
    </NotesContext.Provider>
  );
}

export const useNotes = () => useContext(NotesContext);
