/**
 * Duplicate Profiles Page (P1)
 * Shows potential duplicate profiles from v_potential_duplicate_profiles
 * Allows merging duplicates via merge_duplicate_profiles RPC
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  RadioGroup,
  RadioGroupItem,
  Label,
} from "@/components/ui";
import { useDuplicateProfiles, useMergeDuplicateProfiles } from "@/hooks/data";
import { CheckCircle2, AlertTriangle, RefreshCw, Users, Copy, Merge, Shield } from "lucide-react";
import { useState } from "react";

export default function DuplicatesPage() {
  const [mergeDialog, setMergeDialog] = useState<{
    open: boolean;
    profile1: { id: string; email: string; name: string };
    profile2: { id: string; email: string; name: string };
    keepId: string;
  }>({
    open: false,
    profile1: { id: "", email: "", name: "" },
    profile2: { id: "", email: "", name: "" },
    keepId: "",
  });

  // Data hooks
  const { data: duplicates, isLoading, refetch } = useDuplicateProfiles();
  const mergeDuplicates = useMergeDuplicateProfiles();

  const handleOpenMerge = (dup: { profile_ids: string[]; emails: string[]; names: string[] }) => {
    setMergeDialog({
      open: true,
      profile1: {
        id: dup.profile_ids[0] || "",
        email: dup.emails[0] || "",
        name: dup.names[0] || "",
      },
      profile2: {
        id: dup.profile_ids[1] || "",
        email: dup.emails[1] || "",
        name: dup.names[1] || "",
      },
      keepId: dup.profile_ids[0] || "", // Default to first profile
    });
  };

  const handleMerge = () => {
    const keepProfileId = mergeDialog.keepId;
    const mergeProfileId =
      keepProfileId === mergeDialog.profile1.id ? mergeDialog.profile2.id : mergeDialog.profile1.id;

    mergeDuplicates.mutate(
      { keepProfileId, mergeProfileId },
      {
        onSettled: () => {
          setMergeDialog({
            open: false,
            profile1: { id: "", email: "", name: "" },
            profile2: { id: "", email: "", name: "" },
            keepId: "",
          });
          refetch();
        },
      }
    );
  };

  const getSimilarityBadge = (score: number) => {
    if (score >= 90) {
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    } else if (score >= 70) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    } else {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "email_duplicate":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "name_match":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Duplicate Profiles</h1>
          <p className="text-muted-foreground">
            Review and merge potential duplicate investor profiles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={
              duplicates && duplicates.length > 0
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            }
          >
            {duplicates && duplicates.length > 0 ? (
              <AlertTriangle className="h-4 w-4 mr-1" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            )}
            {duplicates?.length || 0} potential duplicates
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Warning Card */}
      <Card className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Merge with Caution</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Merging profiles will move all transactions, positions, and data from the merged
                profile to the kept profile. This action cannot be easily undone. Review each
                duplicate carefully before merging.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Potential Duplicates
          </CardTitle>
          <CardDescription>
            From v_potential_duplicate_profiles - profiles that may be the same person
          </CardDescription>
        </CardHeader>
        <CardContent>
          {duplicates && duplicates.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile 1</TableHead>
                    <TableHead>Profile 2</TableHead>
                    <TableHead>Match Type</TableHead>
                    <TableHead>Similarity</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duplicates.map((dup, idx) => (
                    <TableRow key={`${dup.match_key}-${idx}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{dup.names[0] || "N/A"}</span>
                          <span className="text-xs text-muted-foreground">
                            {dup.emails[0] || "N/A"}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {(dup.profile_ids[0] || "").slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{dup.names[1] || "N/A"}</span>
                          <span className="text-xs text-muted-foreground">
                            {dup.emails[1] || "N/A"}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {(dup.profile_ids[1] || "").slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeBadge(dup.duplicate_type)}>
                          {dup.duplicate_type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {dup.profile_count} profiles
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenMerge(dup)}
                          disabled={mergeDuplicates.isPending}
                        >
                          <Merge className="h-4 w-4 mr-1" />
                          Merge
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                No duplicate profiles found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                All profiles in v_potential_duplicate_profiles are unique
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Merge Dialog */}
      <Dialog
        open={mergeDialog.open}
        onOpenChange={(open) => setMergeDialog({ ...mergeDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" />
              Merge Duplicate Profiles
            </DialogTitle>
            <DialogDescription>
              Select which profile to keep. All data from the other profile will be moved to the
              kept profile.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup
              value={mergeDialog.keepId}
              onValueChange={(val) => setMergeDialog({ ...mergeDialog, keepId: val })}
            >
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value={mergeDialog.profile1.id} id="profile1" />
                <Label htmlFor="profile1" className="flex-1 cursor-pointer">
                  <div className="font-medium">{mergeDialog.profile1.name}</div>
                  <div className="text-sm text-muted-foreground">{mergeDialog.profile1.email}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    ID: {mergeDialog.profile1.id}
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 mt-2">
                <RadioGroupItem value={mergeDialog.profile2.id} id="profile2" />
                <Label htmlFor="profile2" className="flex-1 cursor-pointer">
                  <div className="font-medium">{mergeDialog.profile2.name}</div>
                  <div className="text-sm text-muted-foreground">{mergeDialog.profile2.email}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    ID: {mergeDialog.profile2.id}
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm">
            <p className="text-yellow-800 dark:text-yellow-200">
              <strong>Warning:</strong> The profile{" "}
              <em>
                {mergeDialog.keepId === mergeDialog.profile1.id
                  ? mergeDialog.profile2.name
                  : mergeDialog.profile1.name}
              </em>{" "}
              will be deleted after merging.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMergeDialog({ ...mergeDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleMerge}
              disabled={mergeDuplicates.isPending || !mergeDialog.keepId}
            >
              {mergeDuplicates.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Merge className="h-4 w-4 mr-2" />
              )}
              Merge Profiles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
