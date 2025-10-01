import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Clipboard } from "lucide-react";

interface WelcomeProps {
  onSelectUser: (user: User) => void;
}

export default function Welcome({ onSelectUser }: WelcomeProps) {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Laddar användare...</p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Clipboard className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Välkommen till Inventeringsappen</h1>
          <p className="text-muted-foreground">Välj ditt namn för att fortsätta</p>
        </div>

        <div className="space-y-4">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user)}
              data-testid={`button-select-user-${user.id}`}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium" data-testid={`text-user-name-${user.id}`}>{user.name}</div>
                <div className="text-sm text-muted-foreground" data-testid={`text-user-role-${user.id}`}>{user.role}</div>
              </div>
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
