import { useEffect, useState } from "react";
import { ChevronRight, FolderOpen, Building2, MoreHorizontal, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  industry: string | null;
  projects: Project[];
}

interface Project {
  id: string;
  name: string;
  status: string;
  progress_percentage: number | null;
  start_date: string | null;
  end_date: string | null;
}

export default function Projects() {
  const [clients, setClients] = useState<Client[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .order("name");

        if (clientsError) throw clientsError;

        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (projectsError) throw projectsError;

        // Group projects by client
        const clientsWithProjects = (clientsData || []).map((client) => ({
          ...client,
          projects: (projectsData || []).filter((p) => p.client_id === client.id),
        }));

        setClients(clientsWithProjects);
        
        // Expand first client by default if exists
        if (clientsWithProjects.length > 0) {
          setExpandedClients(new Set([clientsWithProjects[0].id]));
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleClient = (clientId: string) => {
    setExpandedClients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-success/10 text-success border-success/20";
      case "Proposed":
        return "bg-warning/10 text-warning border-warning/20";
      case "Complete":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.projects.some((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  // Mock data if no real data exists
  const displayClients =
    filteredClients.length > 0
      ? filteredClients
      : [
          {
            id: "1",
            name: "Acme Corporation",
            industry: "Technology",
            projects: [
              {
                id: "p1",
                name: "Digital Transformation Strategy",
                status: "Active",
                progress_percentage: 65,
                start_date: "2024-01-15",
                end_date: "2024-06-30",
              },
              {
                id: "p2",
                name: "Operating Model Redesign",
                status: "Proposed",
                progress_percentage: 0,
                start_date: null,
                end_date: null,
              },
            ],
          },
          {
            id: "2",
            name: "Global Finance Inc",
            industry: "Financial Services",
            projects: [
              {
                id: "p3",
                name: "Post-Merger Integration",
                status: "Active",
                progress_percentage: 45,
                start_date: "2024-02-01",
                end_date: "2024-08-31",
              },
            ],
          },
          {
            id: "3",
            name: "HealthCare Plus",
            industry: "Healthcare",
            projects: [
              {
                id: "p4",
                name: "Cost Optimization Program",
                status: "Complete",
                progress_percentage: 100,
                start_date: "2023-06-01",
                end_date: "2023-12-15",
              },
            ],
          },
        ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage client engagements and project portfolios
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients or projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* File System View */}
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading projects...
          </div>
        ) : displayClients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No projects found. Create your first engagement to get started.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayClients.map((client) => (
              <div key={client.id} className="animate-slide-up">
                {/* Client Row */}
                <button
                  onClick={() => toggleClient(client.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      expandedClients.has(client.id) && "rotate-90"
                    )}
                  />
                  <Building2 className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.industry} • {client.projects.length} project
                      {client.projects.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>

                {/* Projects */}
                {expandedClients.has(client.id) && (
                  <div className="bg-muted/30">
                    {client.projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center gap-3 border-t border-border px-4 py-3 pl-12 hover:bg-muted/50 transition-colors group"
                      >
                        <FolderOpen className="h-4 w-4 text-accent" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{project.name}</p>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", getStatusColor(project.status))}
                            >
                              {project.status}
                            </Badge>
                          </div>
                          {project.progress_percentage !== null &&
                            project.status === "Active" && (
                              <div className="flex items-center gap-2 mt-1">
                                <Progress
                                  value={project.progress_percentage}
                                  className="h-1.5 w-32"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {project.progress_percentage}%
                                </span>
                              </div>
                            )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Edit Project</DropdownMenuItem>
                            <DropdownMenuItem>Export Report</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
