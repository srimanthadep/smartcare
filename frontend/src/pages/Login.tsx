import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Smile, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRole } from "@/types";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const roleIcons: Record<UserRole, React.ReactNode> = {
  doctor: <Smile className="h-5 w-5" />,
  admin: <ShieldCheck className="h-5 w-5" />,
};

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("doctor");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    document.title = "Sign In | Siara Dental";
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(username, password, role);
      toast.success("Signed in successfully");
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center">
          <img src={logo} alt="Siara Dental" className="mb-3 h-16 w-16" />
          <h1 className="text-3xl font-heading font-bold text-foreground">Siara Dental</h1>
          <p className="mt-1 text-sm text-muted-foreground">Modern Dental Records</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-xl font-heading">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Login as</Label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["doctor", "admin"] as UserRole[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          {roleIcons[value]}
                          <span className="capitalize">{value}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter your username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                />
              </div>

              <Button type="submit" className="mt-2 w-full" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </Button>

              {/* Demo credentials removed */}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
