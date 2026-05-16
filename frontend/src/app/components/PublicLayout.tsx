import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { Button } from '@/shared/ui/button';

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Siara Dental" className="h-8 w-8" />
          <span className="font-heading font-bold">Siara Dental</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/book">Book appointment</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
        </nav>
      </header>
      <main className="p-4 md:p-8">
        <Outlet />
      </main>
      <footer className="p-6 text-center text-xs text-muted-foreground">
        © 2026 Siara Dental · Public demo pages
      </footer>
    </div>
  );
};

export default PublicLayout;

