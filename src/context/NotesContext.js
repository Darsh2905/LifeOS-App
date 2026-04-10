import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { generateId } from '../utils/helpers';

const NotesContext = createContext();

export function NotesProvider({ children }) {
  const [notes, setNotes] = useState(() => storage.get('lifeos-notes', []));

  useEffect(() => {
    storage.set('lifeos-notes', notes);
  }, [notes]);

  const addNote = useCallback((note) => {
    setNotes(prev => [{
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      pinned: false,
      color: null,
      ...note,
    }, ...prev]);
  }, []);

  const updateNote = useCallback((id, updates) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
  }, []);

  const deleteNote = useCallback((id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const togglePin = useCallback((id) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  }, []);

  const duplicateNote = useCallback((id) => {
    setNotes(prev => {
      const note = prev.find(n => n.id === id);
      if (!note) return prev;
      return [{
        ...note,
        id: generateId(),
        title: `${note.title} (copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pinned: false,
      }, ...prev];
    });
  }, []);

  const clearAllNotes = useCallback(() => {
    setNotes([]);
  }, []);

  const allTags = [...new Set(notes.flatMap(n => n.tags || []))];

  // Sort: pinned first, then by updatedAt
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  return (
    <NotesContext.Provider value={{ notes: sortedNotes, addNote, updateNote, deleteNote, togglePin, duplicateNote, clearAllNotes, allTags }}>
      {children}
    </NotesContext.Provider>
  );
}

export const useNotes = () => useContext(NotesContext);
