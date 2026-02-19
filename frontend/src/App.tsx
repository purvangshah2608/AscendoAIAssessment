import { useState, useEffect } from 'react';
import { Board } from './components/Board';
import { auth, boards } from './api/endpoints';
import { setAuthToken, isAuthenticated, clearAuthToken } from './api/client';
import type { Board as BoardType } from './types';
import { Loader2, LogOut, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [isLoading, setIsLoading] = useState(false);
  const [boardsList, setBoardsList] = useState<BoardType[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  // Error state
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      loadBoards();
    }
  }, [isLoggedIn]);

  const loadBoards = async () => {
    try {
      const data = await boards.list();
      setBoardsList(data);
      // Don't auto-select any board - let user choose
    } catch {
      toast.error('Failed to load boards');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      if (isRegister) {
        await auth.register({ email, password, full_name: fullName });
        toast.success('Account created! Please log in.', { duration: 4000 });
        setIsRegister(false);
        setPassword('');
      } else {
        const response = await auth.login({ email, password });
        setAuthToken(response.access_token);
        setIsLoggedIn(true);
        setSelectedBoardId(null);
        toast.success('Welcome to Ascendo AI!', { duration: 3000 });
      }
    } catch (error: any) {
      console.error('Auth error:', error);

      // Extract error message
      let message = 'Invalid email or password. Please try again.';

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.map((err: any) => err.msg || err.message).join(', ');
        }
      }

      // Set error state - this will now persist!
      setAuthError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsLoggedIn(false);
    setSelectedBoardId(null);
    setBoardsList([]);
    setEmail('');
    setPassword('');
    setFullName('');
    setAuthError(null);
  };

  const handleCreateBoard = async () => {
    const name = prompt('Enter board name:');
    if (!name) return;

    try {
      const board = await boards.create({ name });
      setBoardsList((prev) => [board, ...prev]);
      setSelectedBoardId(board.id);
      toast.success('Board created!');
    } catch {
      toast.error('Failed to create board');
    }
  };

  // Auth Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Ascendo AI</h1>
            <p className="text-gray-500 mt-2">
              {isRegister ? 'Create your account' : 'Sign in to continue'}
            </p>
          </div>

          {/* Error Display */}
          {authError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-red-700 text-sm font-medium">{authError}</p>
                </div>
                <button
                  onClick={() => setAuthError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Enter your password"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setAuthError(null);
              }}
              className="text-blue-600 hover:underline"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register"}
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <strong>Tip:</strong> Register with any email and password (min 8 characters) to get started.
          </div>
        </div>
      </div>
    );
  }

  // Board Selection Page
  if (selectedBoardId === null) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold">Your Boards</h1>
              <p className="text-gray-600 text-sm mt-1">Ascendo AI Project Management</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          {boardsList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
              <p className="text-gray-500 mb-6">Create your first board to get started</p>
              <button
                onClick={handleCreateBoard}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Board
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {boardsList.map((board) => (
                <button
                  key={board.id}
                  onClick={() => setSelectedBoardId(board.id)}
                  className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
                >
                  <h3 className="font-semibold text-lg">{board.name}</h3>
                  {board.description && (
                    <p className="text-gray-500 text-sm mt-1 truncate">
                      {board.description}
                    </p>
                  )}
                </button>
              ))}

              <button
                onClick={handleCreateBoard}
                className="p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-colors flex items-center justify-center gap-2 text-gray-600"
              >
                <Plus className="w-5 h-5" />
                Create Board
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Board View
  return (
    <Board
      boardId={selectedBoardId}
      onBack={() => setSelectedBoardId(null)}
      onLogout={handleLogout}
    />
  );
}

export default App;