import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const BooksContext = createContext();

export function BooksProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get('/books');
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Books fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const addBook = useCallback(async ({ title, author, totalPages, status, notes }) => {
    try {
      const created = await api.post('/books', { title, author, totalPages, status, notes });
      setBooks(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('Add book error:', err);
    }
  }, []);

  const updateBook = useCallback(async (id, updates) => {
    try {
      const updated = await api.put(`/books/${id}`, updates);
      setBooks(prev => prev.map(b => b.id === id ? updated : b));
      return updated;
    } catch (err) {
      console.error('Update book error:', err);
    }
  }, []);

  const deleteBook = useCallback(async (id) => {
    try {
      await api.delete(`/books/${id}`);
      setBooks(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Delete book error:', err);
    }
  }, []);

  const reading = books.filter(b => b.status === 'reading');
  const toRead = books.filter(b => b.status === 'to_read');
  const finished = books.filter(b => b.status === 'finished');

  return (
    <BooksContext.Provider value={{ books, reading, toRead, finished, loading, addBook, updateBook, deleteBook, refresh }}>
      {children}
    </BooksContext.Provider>
  );
}

export const useBooks = () => useContext(BooksContext);
