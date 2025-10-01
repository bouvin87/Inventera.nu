import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Clipboard, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WelcomeProps {
  onSelectUser: (user: User) => void;
}

export default function Welcome({ onSelectUser }: WelcomeProps) {
  const [selectedName, setSelectedName] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { name: string; password: string }) => {
      return await apiRequest("POST", "/api/login", data);
    },
    onSuccess: (user: User) => {
      localStorage.setItem("loggedInUserId", user.id);
      onSelectUser(user);
    },
    onError: (error: any) => {
      toast({
        title: "Inloggning misslyckades",
        description: error.message || "Ogiltigt namn eller lösenord",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedName || !password) {
      toast({
        title: "Fyll i alla fält",
        description: "Både namn och lösenord krävs",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate({ name: selectedName, password });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Laddar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Clipboard className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Välkommen till Inventeringsappen</h1>
          <p className="text-muted-foreground">Logga in för att fortsätta</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">Välj användare</Label>
            <Select value={selectedName} onValueChange={setSelectedName}>
              <SelectTrigger id="user-select" data-testid="select-user">
                <SelectValue placeholder="Välj ditt namn" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.name}>
                    {user.name} - {user.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Lösenord</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ange ditt lösenord"
              data-testid="input-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? (
              <>
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                Loggar in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Logga in
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Standardlösenord: Euro2025!
        </p>
      </div>
    </div>
  );
}
