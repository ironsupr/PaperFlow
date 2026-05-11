import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Loader2, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { setToken, fetchCurrentUser } = useStore();

  const doLogin = async (email: string, password: string) => {
    const resp = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || 'Login failed');
    setToken(data.access_token);
    await fetchCurrentUser();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        await doLogin(formData.email, formData.password);
      } else {
        // Register
        const resp = await fetch('http://localhost:8000/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.fullName,
            role: 'student',
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Registration failed');
        // Auto-login after successful registration
        await doLogin(formData.email, formData.password);
      }
      navigate('/workspace');
    } catch (error: any) {
      setErrorMsg(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[400px] space-y-12 relative z-10"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-foreground p-1.5 rounded-sm">
              <BrainCircuit size={20} className="text-background" />
            </div>
            <span className="font-semibold text-xl tracking-tight">PaperFlow</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{isLogin ? 'Sign in to workspace' : 'Create your account'}</h2>
            <p className="text-muted-foreground text-sm font-medium">Neural Research Protocol <span className="mono text-[11px] ml-1 opacity-60">v1.0.4-stable</span></p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground/80">Full Name</label>
              <input 
                type="text"
                placeholder="Jane Cooper"
                required
                className="w-full bg-card/30 border border-border rounded py-2.5 px-3 text-sm focus:outline-none focus:border-foreground/30 transition-all font-normal"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground/80">Email address</label>
            <input 
              type="email"
              placeholder="name@company.com"
              required
              className="w-full bg-card/30 border border-border rounded py-2.5 px-3 text-sm focus:outline-none focus:border-foreground/30 transition-all font-normal"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground/80">Password</label>
              {isLogin && <button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground">Forgot password?</button>}
            </div>
            <input 
              type="password"
              placeholder="••••••••"
              required
              className="w-full bg-card/30 border border-border rounded py-2.5 px-3 text-sm focus:outline-none focus:border-foreground/30 transition-all font-normal"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background py-2.5 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : (
              <>
                {isLogin ? 'Continue' : 'Initialize Account'}
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
