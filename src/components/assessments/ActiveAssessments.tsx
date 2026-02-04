import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Target,
  Search,
  Calendar,
  Users,
  Eye,
  Send,
  Trash2,
  MoreVertical,
  ArrowUpDown,
  Filter,
  Building2,
  Layers,
  FolderOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  framework_type: string | null;
  industry: string | null;
  is_public?: boolean;
  created_at?: string;
}

interface Project {
  id: string;
  name: string;
  client?: {
    id: string;
    name: string;
  } | null;
}

interface AssessmentInstance {
  id: string;
  name: string;
  description: string | null;
  status: string;
  assessment_template_id: string;
  project_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  assessment_template?: AssessmentTemplate;
  project?: Project | null;
}

interface ActiveAssessmentsProps {
  instances: AssessmentInstance[];
  onViewResults: (instance: any) => void;
  onManageRecipients: (instance: any) => void;
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-500",
  active: "bg-emerald-500/10 text-emerald-500",
  closed: "bg-blue-500/10 text-blue-500",
  archived: "bg-muted text-muted-foreground",
};

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "status";

export function ActiveAssessments({
  instances,
  onViewResults,
  onManageRecipients,
  onRefresh,
}: ActiveAssessmentsProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instanceToDelete, setInstanceToDelete] = useState<AssessmentInstance | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Extract unique filter options
  const filterOptions = useMemo(() => {
    const statuses = new Set<string>();
    const categories = new Set<string>();
    const industries = new Set<string>();

    instances.forEach((instance) => {
      statuses.add(instance.status);
      if (instance.assessment_template?.category) {
        categories.add(instance.assessment_template.category);
      }
      if (instance.assessment_template?.industry) {
        industries.add(instance.assessment_template.industry);
      }
    });

    return {
      statuses: Array.from(statuses),
      categories: Array.from(categories),
      industries: Array.from(industries),
    };
  }, [instances]);

  // Filter and sort instances
  const filteredInstances = useMemo(() => {
    let filtered = instances.filter((i) => i.status !== "archived");

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.assessment_template?.name.toLowerCase().includes(query) ||
          i.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((i) => i.assessment_template?.category === categoryFilter);
    }

    // Industry filter
    if (industryFilter !== "all") {
      filtered = filtered.filter((i) => i.assessment_template?.industry === industryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [instances, searchQuery, statusFilter, categoryFilter, industryFilter, sortBy]);

  const activeFiltersCount = [statusFilter, categoryFilter, industryFilter].filter(
    (f) => f !== "all"
  ).length;

  const clearFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setIndustryFilter("all");
    setSearchQuery("");
  };

  const handleDeleteClick = (instance: AssessmentInstance) => {
    setInstanceToDelete(instance);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!instanceToDelete) return;

    setDeleting(true);
    try {
      // First delete related data
      await supabase.from("assessment_responses").delete().eq("assessment_instance_id", instanceToDelete.id);
      await supabase.from("assessment_recipients").delete().eq("assessment_instance_id", instanceToDelete.id);
      await supabase.from("project_assessments").delete().eq("assessment_instance_id", instanceToDelete.id);

      // Then delete the instance
      const { error } = await supabase
        .from("assessment_instances")
        .delete()
        .eq("id", instanceToDelete.id);

      if (error) throw error;

      toast({ title: "Assessment removed successfully" });
      onRefresh();
    } catch (error: any) {
      console.error("Error deleting assessment:", error);
      toast({
        title: "Error removing assessment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setInstanceToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {filterOptions.statuses.map((status) => (
              <SelectItem key={status} value={status} className="capitalize">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {filterOptions.categories.map((category) => (
              <SelectItem key={category} value={category} className="capitalize">
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filterOptions.industries.length > 0 && (
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="w-[150px]">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {filterOptions.industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[150px]">
            <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Clear ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredInstances.length} of {instances.filter((i) => i.status !== "archived").length} assessments
      </div>

      {/* Assessments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInstances.map((instance) => (
          <Card key={instance.id} className="border-border group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Badge variant="outline" className={cn("capitalize", statusColors[instance.status])}>
                  {instance.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewResults(instance)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Results
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onManageRecipients(instance)}>
                      <Send className="h-4 w-4 mr-2" />
                      Manage Recipients
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(instance)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Assessment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardTitle className="text-lg mt-2">{instance.name}</CardTitle>
              {instance.assessment_template && (
                <CardDescription className="line-clamp-1">
                  Based on: {instance.assessment_template.name}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(instance.created_at).toLocaleDateString()}</span>
                </div>
                {instance.assessment_template?.category && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {instance.assessment_template.category}
                  </Badge>
                )}
                {instance.assessment_template?.industry && (
                  <Badge variant="outline" className="text-xs">
                    {instance.assessment_template.industry}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => onViewResults(instance)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Results
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => onManageRecipients(instance)}
                >
                  <Send className="h-3.5 w-3.5" />
                  Recipients
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredInstances.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-muted-foreground">
                {searchQuery || activeFiltersCount > 0
                  ? "No matching assessments"
                  : "No active assessments"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || activeFiltersCount > 0
                  ? "Try adjusting your filters"
                  : "Launch an assessment from a template to get started"}
              </p>
              {activeFiltersCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{instanceToDelete?.name}"? This will permanently
              delete all responses and recipient data associated with this assessment. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing..." : "Remove Assessment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
